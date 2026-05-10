const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Permission name is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  resource: {
    type: String,
    required: true,
    enum: ['users', 'tenants', 'leads', 'clients', 'analytics', 'settings', 'roles', 'permissions', 'activities'],
    lowercase: true
  },
  action: {
    type: String,
    required: true,
    enum: ['create', 'read', 'update', 'delete', 'manage', 'export', 'import'],
    lowercase: true
  },
  description: { type: String, maxlength: 200 },
  isSystemPermission: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: ['core', 'admin', 'billing', 'support'],
    default: 'core'
  }
}, { timestamps: true });

permissionSchema.index({ resource: 1, action: 1 }, { unique: true });
permissionSchema.index({ category: 1 });

permissionSchema.statics.PERMISSION_MATRIX = {
  super_admin: {
    users: ['create', 'read', 'update', 'delete', 'manage'],
    tenants: ['create', 'read', 'update', 'delete', 'manage'],
    leads: ['create', 'read', 'update', 'delete', 'export', 'import'],
    clients: ['create', 'read', 'update', 'delete', 'export', 'import'],
    analytics: ['read'],
    settings: ['manage'],
    roles: ['create', 'read', 'update', 'delete', 'manage'],
    permissions: ['read'],
    activities: ['read']
  },
  tenant_admin: {
    users: ['create', 'read', 'update', 'delete', 'manage'],
    leads: ['create', 'read', 'update', 'delete', 'export', 'import'],
    clients: ['create', 'read', 'update', 'delete', 'export', 'import'],
    analytics: ['read'],
    settings: ['manage'],
    roles: ['create', 'read', 'update', 'delete', 'manage'],
    activities: ['read']
  },
  buyer: {
    leads: ['read', 'update'],
    clients: ['read', 'update'],
    analytics: ['read'],
    activities: ['read']
  },
  viewer: {
    leads: ['read'],
    clients: ['read'],
    analytics: ['read'],
    activities: ['read']
  }
};

module.exports = mongoose.model('Permission', permissionSchema);
