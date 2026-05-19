const mongoose = require('mongoose');

const crmSyncLogSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true,
    index: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  platform: {
    type: String,
    enum: ['GHL', 'facebook', 'webhook', 'email', 'custom_crm', 'api'],
    required: true
  },
  syncType: {
    type: String,
    enum: [
      'create_contact', 'update_contact', 'create_opportunity',
      'update_opportunity', 'create_lead', 'update_lead',
      'push_to_webhook', 'push_to_api', 'email_notification'
    ],
    required: true
  },
  externalId: String,
  externalUrl: String,
  requestPayload: mongoose.Schema.Types.Mixed,
  responsePayload: mongoose.Schema.Types.Mixed,
  success: { type: Boolean, default: false },
  errorMessage: String,
  errorCode: String,
  statusCode: Number,
  duration: Number,
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  nextRetryAt: Date,
  syncedAt: Date
}, { timestamps: true });

crmSyncLogSchema.index({ leadId: 1, platform: 1, createdAt: -1 });
crmSyncLogSchema.index({ tenantId: 1, platform: 1, success: 1 });
crmSyncLogSchema.index({ tenantId: 1, externalId: 1 });
crmSyncLogSchema.index({ nextRetryAt: 1 }, { sparse: true });

module.exports = mongoose.model('CrmSyncLog', crmSyncLogSchema);
