const mongoose = require('mongoose');

const leadRoutingHistorySchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true,
    index: true
  },
  eventType: {
    type: String,
    enum: [
      'assigned', 'reassigned', 'routing_failed', 'delivery_failed',
      'delivery_retried', 'delivered', 'ownership_transferred',
      'ownership_locked', 'ownership_unlocked', 'crm_synced',
      'crm_sync_failed', 'unassigned'
    ],
    required: true
  },
  fromOwnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  fromOwnerName: String,
  toBuyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  toBuyerName: String,
  toBuyerEmail: String,
  toBuyerGhlUserId: String,
  routingMethod: {
    type: String,
    enum: [
      'round_robin', 'weighted', 'priority', 'exclusive',
      'state_based', 'fallback', 'manual_reassign', 'api'
    ],
    default: 'round_robin'
  },
  routingReason: String,
  routingPriority: Number,
  campaignId: String,
  campaignName: String,
  supplierId: String,
  sourcePlatform: {
    type: String,
    default: 'form'
  },
  destinationPlatform: String,
  leadState: String,
  leadCountry: String,
  leadEmail: String,
  systemNotes: String,
  performedBy: {
    type: String,
    default: 'system'
  },
  performedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: mongoose.Schema.Types.Mixed,
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  }
}, { timestamps: true });

leadRoutingHistorySchema.index({ leadId: 1, createdAt: -1 });
leadRoutingHistorySchema.index({ tenantId: 1, eventType: 1, createdAt: -1 });
leadRoutingHistorySchema.index({ tenantId: 1, toBuyerId: 1, createdAt: -1 });
leadRoutingHistorySchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model('LeadRoutingHistory', leadRoutingHistorySchema);
