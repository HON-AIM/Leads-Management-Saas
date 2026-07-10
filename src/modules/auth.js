const router = require('express').Router();
const authService = require('../services/authService');
const { authenticate } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');
const { success, error, created } = require('../utils/response');

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password, tenantSlug } = req.body;
    if (!email || !password || !tenantSlug) {
      return error(res, 'Email, password, and tenantSlug are required', 400);
    }

    const Tenant = require('../models/Tenant');
    const tenant = await Tenant.findOne({ slug: tenantSlug, status: 'active' });
    if (!tenant) return error(res, 'Invalid tenant', 401);

    const result = await authService.login(email, password, tenant._id);

    if (process.env.NODE_ENV === 'production') {
      res.cookie('accessToken', result.accessToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 15 * 60 * 1000 });
      res.cookie('refreshToken', result.refreshToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
    }

    return success(res, { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken });
  } catch (err) {
    return error(res, err.message, 401);
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return error(res, 'Refresh token required', 400);
    const result = await authService.refresh(refreshToken);

    if (process.env.NODE_ENV === 'production') {
      res.cookie('accessToken', result.accessToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 15 * 60 * 1000 });
      res.cookie('refreshToken', result.refreshToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
    }

    return success(res, { accessToken: result.accessToken, refreshToken: result.refreshToken });
  } catch (err) {
    return error(res, err.message, 401);
  }
});

router.post('/logout', authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(req.userId, refreshToken);

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return success(res, { message: 'Logged out' });
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/me', authenticate, async (req, res) => {
  return success(res, {
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      tenant: req.tenant,
    },
  });
});

module.exports = router;
