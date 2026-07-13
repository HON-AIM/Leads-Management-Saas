const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: { type: String, enum: ['webhook', 'manual', 'api', 'csv'], default: 'webhook' },
    status: { type: String, enum: ['active', 'paused', 'inactive'], default: 'active' },
    supplierKey: { type: String, required: true, unique: true },

    allowedCampaignIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' }],

    totalLeadsReceived: { type: Number, default: 0 },
    lastLeadAt: { type: Date },

    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

supplierSchema.index({ tenantId: 1, status: 1 });
supplierSchema.index({ tenantId: 1, supplierKey: 1 }, { unique: true });

module.exports = mongoose.model('Supplier', supplierSchema);
