const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },

    source: { type: String, default: 'webhook' },
    webhookUrl: { type: String, default: '' },

    routingMode: {
      type: String,
      enum: ['round_robin', 'weighted', 'priority', 'exclusive'],
      default: 'round_robin',
    },
    costPerLead: { type: Number, default: 0, min: 0 },
    dedupWindowHours: { type: Number, default: 720, min: 1 },

    assignedBuyers: [
      {
        buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true },
        weight: { type: Number, default: 1, min: 1 },
        priority: { type: Number, default: 0 },
      },
    ],

    roundRobinIndex: { type: Number, default: 0 },
    leadsToday: { type: Number, default: 0 },
    lastActivityAt: { type: Date },

    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

campaignSchema.index({ tenantId: 1, status: 1 });
campaignSchema.index({ tenantId: 1, name: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);
