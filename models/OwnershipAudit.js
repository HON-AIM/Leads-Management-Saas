const mongoose = require('mongoose');

const ownershipAuditSchema = new mongoose.Schema({
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
  eventType: {
    type: String,
    enum: [
      'ownership_assigned', 'ownership_transferred',
      'ownership_locked', 'ownership_unlocked',
      'reassigned', 'manual_override'
    ],
    required: true
  },
  previousOwnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  previousOwnerName: String,
  newOwnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  newOwnerName: String,
  newOwnerEmail: String,
  routingMethod: String,
  routingReason: String,
  campaignId: String,
  campaignName: String,
  sourcePlatform: String,
  performedBy: {
    type: String,
    default: 'system'
  },
  performedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String,
  metadata: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String
}, { timestamps: true });

ownershipAuditSchema.index({ leadId: 1, createdAt: -1 });
ownershipAuditSchema.index({ tenantId: 1, eventType: 1, createdAt: -1 });
ownershipAuditSchema.index({ tenantId: 1, newOwnerId: 1, createdAt: -1 });

module.exports = mongoose.model('OwnershipAudit', ownershipAuditSchema);
