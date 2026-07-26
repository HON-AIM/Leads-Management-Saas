const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const authService = require('../services/authService');
const { authenticate, authorize, generateAccessToken, generateRefreshToken } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');
const { success, error, created } = require('../utils/response');
const { validate } = require('../middleware/validate');
const { login: loginSchema, inviteUser: inviteUserSchema, acceptInvite: acceptInviteSchema } = require('../middleware/validation/schemas');
const logger = require('../utils/logger');

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

router.post('/login', loginLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password, tenantSlug } = req.body;

    const Tenant = require('../models/Tenant');
    const tenant = await Tenant.findOne({ slug: tenantSlug, status: 'active' });
    if (!tenant) return error(res, 'Invalid workspace', 401);

    const result = await authService.login(email, password, tenant._id);

    res.cookie('accessToken', result.accessToken, { ...COOKIE_OPTS, maxAge: 60 * 60 * 1000 });
    res.cookie('refreshToken', result.refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });

    return success(res, { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken });
  } catch (err) {
    return error(res, err.message, 401);
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) return error(res, 'Refresh token required', 400);
    const result = await authService.refresh(refreshToken);

    res.cookie('accessToken', result.accessToken, { ...COOKIE_OPTS, maxAge: 60 * 60 * 1000 });
    res.cookie('refreshToken', result.refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });

    return success(res, { accessToken: result.accessToken, refreshToken: result.refreshToken });
  } catch (err) {
    return error(res, err.message, 401);
  }
});

router.post('/logout', authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(req.userId, refreshToken);

    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    return success(res, { message: 'Logged out' });
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/me', authenticate, async (req, res) => {
  const t = req.tenant;
  return success(res, {
    user: {
      id: req.user._id,
      firstName: (req.user.name || '').split(' ')[0] || '',
      lastName: (req.user.name || '').split(' ').slice(1).join(' ') || '',
      email: req.user.email,
      role: req.user.role,
      tenantId: t?._id,
      tenantName: t?.name || '',
      tenantSlug: t?.slug || '',
    },
  });
});

router.put('/password', authenticate, validate(require('../middleware/validation/schemas').changePassword), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const User = require('../models/User');
    const user = await User.findById(req.userId).select('+password');
    if (!user) return error(res, 'User not found', 404);

    const valid = await user.comparePassword(currentPassword);
    if (!valid) return error(res, 'Current password is incorrect', 400);

    user.password = newPassword;
    await user.save();

    return success(res, { message: 'Password updated successfully' });
  } catch (err) {
    return error(res, err.message, 500);
  }
});

router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const User = require('../models/User');
    const users = await User.find({ tenantId: req.tenantId })
      .select('name email role status createdAt')
      .sort({ createdAt: -1 });
    return success(res, { users });
  } catch (err) {
    return error(res, err.message, 500);
  }
});

router.post('/invite', authenticate, authorize('admin'), validate(inviteUserSchema), async (req, res) => {
  try {
    const User = require('../models/User');
    const Tenant = require('../models/Tenant');
    const { sendTeamInviteEmail } = require('../services/emailService');
    const { email, name, role } = req.body;

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail, tenantId: req.tenantId });
    if (existing) {
      if (existing.status === 'active') {
        return error(res, 'A user with this email already exists in your workspace', 400);
      }
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(rawToken, 10);
      existing.inviteToken = hashedToken;
      existing.inviteTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      existing.name = name || existing.name;
      if (role) existing.role = role;
      await existing.save();

      const tenant = await Tenant.findById(req.tenantId);
      const tenantName = tenant?.name || 'LeadFlowX';
      const inviteLink = `${require('../config').frontendUrl}/accept-invite?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;

      try {
        await sendTeamInviteEmail(
          normalizedEmail,
          existing.name,
          req.user?.name || 'An admin',
          tenantName,
          inviteLink,
          existing.role,
        );
        logger.info('Invite resent to pending user', { email: normalizedEmail, userId: existing._id?.toString(), tenantId: req.tenantId?.toString() });
        return success(res, { message: 'A pending invite already exists for this email. A new invite has been sent.', user: { id: existing._id, name: existing.name, email: existing.email, role: existing.role, status: existing.status } });
      } catch (emailErr) {
        logger.error('Failed to send invite email', { email: normalizedEmail, tenantId: req.tenantId?.toString(), error: emailErr.message });
        return error(res, `A pending invite exists but the email failed to send. Share this link manually: ${inviteLink}`, 500);
      }
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(rawToken, 10);
    const inviteTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const user = await User.create({
      email: normalizedEmail,
      name,
      role: role || 'member',
      tenantId: req.tenantId,
      status: 'pending',
      inviteToken: hashedToken,
      inviteTokenExpiresAt,
      invitedBy: req.user._id,
    });

    const tenant = await Tenant.findById(req.tenantId);
    const tenantName = tenant?.name || 'LeadFlowX';
    const inviteLink = `${require('../config').frontendUrl}/accept-invite?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;

    let emailSent = false;
    try {
      await sendTeamInviteEmail(
        normalizedEmail,
        name,
        req.user?.name || 'An admin',
        tenantName,
        inviteLink,
        role || 'member',
      );
      emailSent = true;
    } catch (emailErr) {
      logger.error('Failed to send invite email', {
        email: normalizedEmail,
        tenantId: req.tenantId?.toString(),
        error: emailErr.message,
        stack: emailErr.stack,
      });
      return error(res, `Account created for ${normalizedEmail} but the invite email failed to send. Share this link manually: ${inviteLink}`, 500);
    }

    logger.info('Invite sent successfully', { email: normalizedEmail, role: role || 'member', tenantId: req.tenantId?.toString() });
    return created(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    logger.error('Invite endpoint error', { message: err.message, code: err.code, stack: err.stack });
    return error(res, err.message, 400);
  }
});

router.post('/accept-invite', validate(acceptInviteSchema), async (req, res) => {
  try {
    const User = require('../models/User');
    const { token, email, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+inviteToken +inviteTokenExpiresAt');
    if (!user) return error(res, 'No pending invite found for this email', 400);

    if (user.status !== 'pending') {
      return error(res, 'This invite has already been accepted. Please log in instead.', 400);
    }

    if (!user.inviteToken || !user.inviteTokenExpiresAt) {
      return error(res, 'No valid invite found. Please ask your admin to resend the invite.', 400);
    }

    if (user.inviteTokenExpiresAt < new Date()) {
      return error(res, 'This invite link has expired. Please ask your admin to resend the invite.', 400);
    }

    const tokenValid = await bcrypt.compare(token, user.inviteToken);
    if (!tokenValid) {
      return error(res, 'Invalid invite link. Please check your email and use the original link.', 400);
    }

    user.password = password;
    user.status = 'active';
    user.inviteToken = undefined;
    user.inviteTokenExpiresAt = undefined;
    await user.save();

    return success(res, { message: 'Account activated successfully. You can now log in.' });
  } catch (err) {
    return error(res, err.message, 400);
  }
});

router.post('/invite/:userId/resend', authenticate, authorize('admin'), async (req, res) => {
  try {
    const User = require('../models/User');
    const Tenant = require('../models/Tenant');
    const { sendTeamInviteEmail } = require('../services/emailService');

    const user = await User.findOne({ _id: req.params.userId, tenantId: req.tenantId });
    if (!user) return error(res, 'User not found', 404);

    if (user.status !== 'pending') {
      return error(res, 'Can only resend invites for pending users', 400);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(rawToken, 10);
    const inviteTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    user.inviteToken = hashedToken;
    user.inviteTokenExpiresAt = inviteTokenExpiresAt;
    await user.save();

    const tenant = await Tenant.findById(req.tenantId);
    const tenantName = tenant?.name || 'LeadFlowX';
    const inviteLink = `${require('../config').frontendUrl}/accept-invite?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    try {
      await sendTeamInviteEmail(
        user.email,
        user.name,
        req.user?.name || 'An admin',
        tenantName,
        inviteLink,
        user.role,
      );
      return success(res, { message: 'Invite resent successfully' });
    } catch (emailErr) {
      logger.error('Failed to resend invite email', { email: user.email, userId: user._id?.toString(), error: emailErr.message });
      return error(res, `Invite link refreshed but the email failed to send. Share this link manually: ${inviteLink}`, 500);
    }
  } catch (err) {
    return error(res, err.message, 500);
  }
});

router.delete('/users/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const User = require('../models/User');

    if (req.params.id === req.userId.toString()) {
      return error(res, 'You cannot remove yourself', 400);
    }

    const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!user) {
      logger.warn('Delete failed: user not found', { userId: req.params.id, tenantId: req.tenantId?.toString() });
      return error(res, 'User not found', 404);
    }

    if (user.role === 'super_admin') {
      return error(res, 'Cannot remove a super admin', 400);
    }

    await User.findByIdAndDelete(req.params.id);
    logger.info('User removed', { userId: req.params.id, email: user.email, tenantId: req.tenantId?.toString() });
    return success(res, { message: 'User removed' });
  } catch (err) {
    logger.error('Delete user error', { userId: req.params.id, error: err.message, stack: err.stack });
    return error(res, err.message, 500);
  }
});

router.get('/api-key', authenticate, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.userId).select('+apiKey');
    if (!user) return error(res, 'User not found', 404);

    if (!user.apiKey) {
      return success(res, { hasKey: false });
    }

    const masked = user.apiKey.length > 10
      ? `${user.apiKey.slice(0, 6)}...${user.apiKey.slice(-4)}`
      : '****';
    return success(res, { hasKey: true, masked });
  } catch (err) {
    return error(res, err.message, 500);
  }
});

router.post('/api-key/generate', authenticate, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.userId).select('+apiKey');
    if (!user) return error(res, 'User not found', 404);

    const apiKey = crypto.randomBytes(24).toString('hex');
    user.apiKey = apiKey;
    await user.save();

    return success(res, { apiKey });
  } catch (err) {
    return error(res, err.message, 500);
  }
});

router.post('/api-key/revoke', authenticate, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.userId).select('+apiKey');
    if (!user) return error(res, 'User not found', 404);

    user.apiKey = undefined;
    await user.save();

    return success(res, { message: 'API key revoked' });
  } catch (err) {
    return error(res, err.message, 500);
  }
});

module.exports = router;
