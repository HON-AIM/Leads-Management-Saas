const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['login', 'logout', 'failed_login', 'account_locked', 'password_change', 'password_reset',
           'email_verified', 'user_created', 'user_updated', 'user_deleted', 'user_suspended',
           'tenant_created', 'tenant_updated', 'tenant_suspended', 'tenant_activated',
           'role_created', 'role_updated', 'role_deleted', 'role_assigned',
           'lead_created', 'lead_updated', 'lead_deleted', 'lead_assigned',
           'client_created', 'client_updated', 'client_deleted',
           'permission_denied', 'token_refreshed', 'token_revoked', 'mfa_enabled', 'mfa_disabled']
  },
  resource: {
    type: String,
    enum: ['auth', 'user', 'tenant', 'role', 'permission', 'lead', 'client', 'activity']
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  details: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  ipAddress: String,
  userAgent: String,
  status: {
    type: String,
    enum: ['success', 'failure'],
    default: 'success'
  },
  message: String
}, { timestamps: true });

auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
