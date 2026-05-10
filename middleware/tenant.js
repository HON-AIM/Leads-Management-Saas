const Tenant = require('../models/Tenant');

const resolveTenant = async (req, res, next) => {
  try {
    let tenantIdentifier = null;

    const tenantHeader = req.headers['x-tenant-id'] || req.headers['x-tenant-slug'];
    if (tenantHeader) {
      tenantIdentifier = tenantHeader;
    }

    if (!tenantIdentifier) {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        if (token) {
          const jwt = require('jsonwebtoken');
          const JWT_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
          try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const User = require('../models/User');
            const user = await User.findById(decoded.userId).populate('tenantId');
            if (user && user.tenantId) {
              req.tenant = user.tenantId;
              req.tenantId = user.tenantId._id;
              return next();
            }
          } catch (err) {
          }
        }
      }
    }

    if (!tenantIdentifier) {
      const host = req.headers.host || '';
      const domain = host.split(':')[0];

      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        tenantIdentifier = 'default';
      } else {
        tenantIdentifier = domain;
      }
    }

    const tenantQuery = { status: 'active' };
    if (tenantIdentifier.length === 24) {
      tenantQuery._id = tenantIdentifier;
    } else if (/^[a-z0-9-]+$/.test(tenantIdentifier)) {
      tenantQuery.slug = tenantIdentifier;
    } else {
      tenantQuery.domain = tenantIdentifier;
    }

    const tenant = await Tenant.findOne(tenantQuery);

    if (!tenant) {
      return res.status(404).json({
        message: 'Tenant not found or inactive',
        code: 'TENANT_NOT_FOUND'
      });
    }

    if (tenant.status === 'suspended') {
      return res.status(403).json({
        message: 'Tenant is suspended',
        reason: tenant.suspensionReason
      });
    }

    req.tenant = tenant;
    req.tenantId = tenant._id;
    next();
  } catch (error) {
    console.error('Tenant resolution error:', error);
    res.status(500).json({ message: 'Tenant resolution failed' });
  }
};

const checkTenantSubscription = async (req, res, next) => {
  try {
    if (!req.tenant) {
      return next();
    }

    const tenant = req.tenant;

    if (tenant.subscription?.expiresAt && tenant.subscription.expiresAt < new Date()) {
      if (!tenant.subscription.cancelAtPeriodEnd) {
        tenant.status = 'inactive';
        await tenant.save();
        return res.status(402).json({
          message: 'Subscription expired',
          code: 'SUBSCRIPTION_EXPIRED'
        });
      }
    }

    if (tenant.settings?.maxUsers) {
      const User = require('../models/User');
      const userCount = await User.countDocuments({ tenantId: tenant._id, status: 'active' });
      if (userCount >= tenant.settings.maxUsers) {
        req.tenantUserLimitReached = true;
      }
    }

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    next();
  }
};

const optionalTenant = (req, res, next) => {
  if (req.user && req.user.tenantId) {
    req.tenantId = req.user.tenantId._id;
    req.tenant = req.user.tenantId;
  }
  next();
};

module.exports = {
  resolveTenant,
  checkTenantSubscription,
  optionalTenant
};
