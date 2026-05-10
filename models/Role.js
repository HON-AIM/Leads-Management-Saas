const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    trim: true
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  description: { type: String, maxlength: 200 },
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  isSystemRole: {
    type: Boolean,
    default: false
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null
  },
  color: { type: String, default: '#6b7280' },
  priority: { type: Number, default: 0 },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

roleSchema.index({ name: 1, tenantId: 1 }, { unique: true });
roleSchema.index({ slug: 1, tenantId: 1 }, { unique: true });
roleSchema.index({ tenantId: 1 });
roleSchema.index({ isSystemRole: 1 });

roleSchema.statics.SYSTEM_ROLES = ['super_admin', 'tenant_admin', 'buyer', 'viewer'];

roleSchema.methods.isBuiltIn = function() {
  return this.isSystemRole === true;
};

roleSchema.methods.canModify = function(user) {
  if (this.isBuiltIn()) return false;
  if (user.role?.name === 'super_admin') return true;
  if (user.role?.name === 'tenant_admin') {
    return this.tenantId?.toString() === user.tenantId.toString();
  }
  return false;
};

module.exports = mongoose.model('Role', roleSchema);
