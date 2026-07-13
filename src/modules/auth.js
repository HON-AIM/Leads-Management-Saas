const router = require('express').Router();
const authService = require('../services/authService');
const { authenticate, authorize } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');
const { success, error, created } = require('../utils/response');
const { validate } = require('../middleware/validate');
const { login: loginSchema, inviteUser: inviteUserSchema } = require('../middleware/validation/schemas');

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
    const { email, name, password, role } = req.body;

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail, tenantId: req.tenantId });
    if (existing) return error(res, 'A user with this email already exists in your workspace', 400);

    const user = await User.create({
      email: normalizedEmail,
      name,
      password,
      role: role || 'member',
      tenantId: req.tenantId,
      status: 'active',
    });

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
    return error(res, err.message, 400);
  }
});

router.delete('/users/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const User = require('../models/User');

    if (req.params.id === req.userId.toString()) {
      return error(res, 'You cannot remove yourself', 400);
    }

    const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!user) return error(res, 'User not found', 404);

    if (user.role === 'super_admin') {
      return error(res, 'Cannot remove a super admin', 400);
    }

    await User.findByIdAndDelete(req.params.id);
    return success(res, { message: 'User removed' });
  } catch (err) {
    return error(res, err.message, 500);
  }
});

module.exports = router;
