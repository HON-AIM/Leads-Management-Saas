const mongoose = require('mongoose');

const buyerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String },

    status: { type: String, enum: ['active', 'paused', 'inactive'], default: 'active' },

    leadCap: { type: Number, default: 0 },
    dailyCap: { type: Number, default: 0 },
    monthlyCap: { type: Number, default: 0 },
    leadsReceived: { type: Number, default: 0 },
    dailyLeadsReceived: { type: Number, default: 0 },
    monthlyLeadsReceived: { type: Number, default: 0 },
    lastAssignedAt: { type: Date },

    pricePerLead: { type: Number, default: 0, min: 0 },
    weight: { type: Number, default: 1, min: 1 },
    priority: { type: Number, default: 0 },

    allowedStates: [{ type: String, uppercase: true }],

    delivery: {
      provider: { type: String, enum: ['none', 'webhook', 'ghl'], default: 'none' },
      url: { type: String },
      apiKey: { type: String },
      locationId: { type: String },
      secret: { type: String },
    },

    schedule: {
      enabled: { type: Boolean, default: false },
      timezone: { type: String, default: 'America/New_York' },
      days: [{ type: Number, min: 0, max: 6 }],
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '17:00' },
    },

    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

buyerSchema.index({ tenantId: 1, status: 1 });
buyerSchema.index({ tenantId: 1, allowedStates: 1 });

buyerSchema.pre('save', function (next) {
  if (this.leadCap > 0 && this.leadsReceived >= this.leadCap) {
    this.status = 'full';
  } else if (this.status === 'full' && (this.leadCap === 0 || this.leadsReceived < this.leadCap)) {
    this.status = 'active';
  }
  next();
});

module.exports = mongoose.model('Buyer', buyerSchema);
