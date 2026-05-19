const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed'],
    default: 'active'
  },
  startDate: Date,
  endDate: Date,

  routingMode: {
    type: String,
    enum: ['round_robin', 'weighted', 'exclusive', 'state_based'],
    default: 'round_robin'
  },

  sources: [{ type: String, trim: true, lowercase: true }],

  assignedBuyers: [{
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    weight: { type: Number, default: 1, min: 1 },
  }],

  stateRouting: [{
    country: { type: String, default: 'US', uppercase: true },
    state: { type: String, uppercase: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    priority: { type: Number, default: 0 },
  }],

  totalLeads: { type: Number, default: 0 },
  assignedLeads: { type: Number, default: 0 },
  convertedLeads: { type: Number, default: 0 },

  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
}, { timestamps: true });

campaignSchema.index({ tenantId: 1, status: 1 });
campaignSchema.index({ tenantId: 1, name: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);
