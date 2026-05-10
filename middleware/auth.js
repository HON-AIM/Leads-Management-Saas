const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const AuditLogService = require('../services/auditLogService');

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'your-access-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';

const authenticate = async (req, res, next) => {
  try {
    const accessToken = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

    if (!accessToken) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(accessToken, JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.userId)
      .select('+password')
      .populate('role')
      .populate('tenantId');

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Account is not active' });
    }

    if (user.isLocked()) {
      await AuditLogService.log({
        action: 'permission_denied',
        resource: 'auth',
        performedBy: user._id,
        tenantId: user.tenantId._id,
        status: 'failure',
        message: 'Account locked due to too many failed login attempts',
        ipAddress: req.ip
      });
      return res.status(423).json({ message: 'Account is locked. Please contact support or try again later.' });
    }

    if (!user.tenantId || user.tenantId.status !== 'active') {
      return res.status(403).json({ message: 'Tenant is not active' });
    }

    req.user = user;
    req.tenantId = user.tenantId._id;
    req.tenant = user.tenantId;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Access token expired', code: 'TOKEN_EXPIRED' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid access token', code: 'INVALID_TOKEN' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const accessToken = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

    if (!accessToken) {
      return next();
    }

    const decoded = jwt.verify(accessToken, JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.userId)
      .populate('role')
      .populate('tenantId');

    if (user && user.status === 'active' && !user.isLocked()) {
      req.user = user;
      req.tenantId = user.tenantId._id;
      req.tenant = user.tenantId;
    }

    next();
  } catch (error) {
    next();
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userRole = req.user.role?.name;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Insufficient permissions', code: 'INSUFFICIENT_ROLE' });
    }

    next();
  };
};

const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      if (req.user.role?.name === 'super_admin') {
        return next();
      }

      const role = await Role.findById(req.user.role).populate('permissions');
      if (!role) {
        return res.status(403).json({ message: 'Role not found' });
      }

      const hasPermission = role.permissions.some(
        permission => permission.resource === resource && permission.action === action
      );

      if (!hasPermission) {
        await AuditLogService.log({
          action: 'permission_denied',
          resource,
          performedBy: req.user._id,
          tenantId: req.tenantId,
          status: 'failure',
          message: `User attempted ${action} on ${resource} without permission`,
          ipAddress: req.ip
        });
        return res.status(403).json({ message: 'Insufficient permissions', code: 'MISSING_PERMISSION' });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Authorization error' });
    }
  };
};

const tenantIsolation = (req, res, next) => {
  if (!req.user || !req.tenantId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  req.tenantFilter = { tenantId: req.tenantId };

  const originalJson = res.json.bind(res);
  res.json = function(data) {
    if (data && typeof data === 'object' && !data._id) {
      if (data.tenantId && data.tenantId.toString() !== req.tenantId.toString()) {
        console.warn('[TenantIsolation] Attempted to leak cross-tenant data');
        return originalJson.call(this, { message: 'Access denied' });
      }
    }
    return originalJson.call(this, data);
  };

  next();
};

const enforceTenantInQueries = (Model) => {
  return async (req, res, next) => {
    if (!req.tenantId) {
      return res.status(401).json({ message: 'Tenant context required' });
    }

    const originalFind = Model.find.bind(Model);
    const originalFindOne = Model.findOne.bind(Model);

    Model.find = function(query = {}, ...args) {
      query.tenantId = req.tenantId;
      return originalFind(query, ...args);
    };

    Model.findOne = function(query = {}, ...args) {
      query.tenantId = req.tenantId;
      return originalFindOne(query, ...args);
    };

    req._originalFind = originalFind;
    req._originalFindOne = originalFindOne;

    res.on('finish', () => {
      Model.find = originalFind;
      Model.findOne = originalFindOne;
    });

    next();
  };
};

const requireActiveTenant = async (req, res, next) => {
  const Tenant = require('../models/Tenant');

  const tenantId = req.tenantId || req.user?.tenantId?._id;
  if (!tenantId) {
    return res.status(401).json({ message: 'Tenant context required' });
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    return res.status(404).json({ message: 'Tenant not found' });
  }

  if (tenant.status === 'suspended') {
    return res.status(403).json({
      message: 'Your account has been suspended',
      reason: tenant.suspensionReason
    });
  }

  if (tenant.status !== 'active') {
    return res.status(403).json({ message: 'Tenant is not active' });
  }

  req.tenant = tenant;
  next();
};

const generateAccessToken = (userId, role = null) => {
  const payload = { userId };
  if (role) payload.role = role;
  return jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: '15m',
    issuer: 'lead-distribution-saas',
    audience: 'lead-distribution-api'
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, {
    expiresIn: '7d',
    issuer: 'lead-distribution-saas',
    audience: 'lead-distribution-api'
  });
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  requirePermission,
  tenantIsolation,
  enforceTenantInQueries,
  requireActiveTenant,
  generateAccessToken,
  generateRefreshToken,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET
};
