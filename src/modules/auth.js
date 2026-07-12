const router = require('express').Router();
const authService = require('../services/authService');
const { authenticate } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');
const { success, error, created } = require('../utils/response');
const { validate } = require('../middleware/validate');
const { login: loginSchema } = require('../middleware/validation/schemas');
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
    const User = require('../models/User');
    const tenant = await Tenant.findOne({ slug: tenantSlug, status: 'active' });
    if (!tenant) {
      logger.warn('[LOGIN-DIAG] Tenant not found', { tenantSlug, email });
      return error(res, 'Invalid workspace', 401);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail, tenantId: tenant._id }).select('+password');
    if (!user) {
      logger.warn('[LOGIN-DIAG] User not found for tenant', { tenantSlug, tenantId: tenant._id.toString(), email: normalizedEmail });
      return error(res, 'Invalid credentials', 401);
    }

    const bcrypt = require('bcryptjs');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      logger.warn('[LOGIN-DIAG] Password mismatch', { tenantSlug, email: normalizedEmail, userId: user._id.toString() });
      return error(res, 'Invalid credentials', 401);
    }

    logger.info('[LOGIN-DIAG] Login successful', { tenantSlug, email: normalizedEmail, userId: user._id.toString() });

    const result = await authService.login(email, password, tenant._id);

    res.cookie('accessToken', result.accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', result.refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });

    return success(res, { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken });
  } catch (err) {
    logger.error('[LOGIN-DIAG] Unexpected error', { error: err.message, stack: err.stack });
    return error(res, err.message, 401);
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) return error(res, 'Refresh token required', 400);
    const result = await authService.refresh(refreshToken);

    res.cookie('accessToken', result.accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
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

module.exports = router;
