const mongoose = require('mongoose');

const routingLogSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },

    routingMode: { type: String },
    eligibleBuyerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Buyer' }],
    selectedBuyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer' },
    reason: { type: String },
    durationMs: { type: Number },

    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  },
  { timestamps: true }
);

routingLogSchema.index({ tenantId: 1, createdAt: -1 });
routingLogSchema.index({ leadId: 1 });
routingLogSchema.index({ tenantId: 1, selectedBuyerId: 1 });

module.exports = mongoose.model('RoutingLog', routingLogSchema);
