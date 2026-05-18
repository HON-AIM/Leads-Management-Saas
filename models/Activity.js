const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['lead_received', 'lead_assigned', 'client_created', 'client_updated', 'client_deleted', 'lead_cap_reset', 'campaign_created', 'campaign_updated'],
    required: true
  },
  message: { type: String, required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

// Index for efficient tenant-specific queries
activitySchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
