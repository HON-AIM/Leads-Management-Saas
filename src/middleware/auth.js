const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const logger = require('../utils/logger');

function generateAccessToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role, tenantId: user.tenantId },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiry, issuer: 'lead-distribution', audience: 'lead-api' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user._id, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiry, issuer: 'lead-distribution' }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret, { issuer: 'lead-distribution', audience: 'lead-api' });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret, { issuer: 'lead-distribution' });
}

async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'Authentication required' });

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId)
      .populate('tenantId', 'name slug status');

    if (!user) return res.status(401).json({ success: false, error: 'User not found' });
    if (user.status !== 'active') return res.status(401).json({ success: false, error: 'Account is inactive' });
    if (user.isLocked()) return res.status(401).json({ success: false, error: 'Account is locked' });
    if (!user.tenantId || user.tenantId.status !== 'active') {
      return res.status(401).json({ success: false, error: 'Tenant is inactive' });
    }

    req.user = user;
    req.userId = user._id;
    req.tenantId = user.tenantId._id;
    req.tenant = user.tenantId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
    const userRole = typeof req.user.role === 'string' ? req.user.role : req.user.role?.name;
    if (roles.includes(userRole)) return next();
    return res.status(403).json({ success: false, error: 'Insufficient permissions' });
  };
}

function optionalAuth(req, res, next) {
  const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next();
  try {
    const decoded = verifyAccessToken(token);
    req.userId = decoded.userId;
    req.tenantId = decoded.tenantId;
  } catch (_) {}
  next();
}

module.exports = { authenticate, authorize, optionalAuth, generateAccessToken, generateRefreshToken, verifyRefreshToken };
