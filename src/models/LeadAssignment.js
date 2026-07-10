const mongoose = require('mongoose');

const leadAssignmentSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },

    routingMode: { type: String },

    status: {
      type: String,
      enum: ['pending', 'delivered', 'failed', 'returned'],
      default: 'pending',
    },

    revenue: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    bidAmount: { type: Number },

    deliveredAt: { type: Date },

    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  },
  { timestamps: true }
);

leadAssignmentSchema.index({ leadId: 1 });
leadAssignmentSchema.index({ buyerId: 1, createdAt: -1 });
leadAssignmentSchema.index({ tenantId: 1, createdAt: -1 });
leadAssignmentSchema.index({ tenantId: 1, status: 1 });
leadAssignmentSchema.index({ tenantId: 1, buyerId: 1, status: 1 });

module.exports = mongoose.model('LeadAssignment', leadAssignmentSchema);
