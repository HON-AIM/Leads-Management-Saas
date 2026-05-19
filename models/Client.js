const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, default: 'US', uppercase: true },
  leadCap: { type: Number, required: true },
  leadsReceived: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['active', 'full', 'inactive'],
    default: 'active'
  },
  phone: String,
  address: String,

  routingMode: {
    type: String,
    enum: ['round_robin', 'weighted', 'priority', 'exclusive'],
    default: 'round_robin'
  },
  weight: { type: Number, default: 1, min: 1 },
  priority: { type: Number, default: 0, min: 0 },
  allowedStates: [{ type: String, uppercase: true }],
  allowedCountries: [{ type: String, uppercase: true }],

  dailyCap: { type: Number, default: 0 },
  monthlyCap: { type: Number, default: 0 },
  dailyLeadsReceived: { type: Number, default: 0 },
  monthlyLeadsReceived: { type: Number, default: 0 },
  lastAssignedAt: Date,

  isPaused: { type: Boolean, default: false },
  pausedAt: Date,
  pausedReason: String,

  schedule: {
    enabled: { type: Boolean, default: false },
    timezone: { type: String, default: 'America/New_York' },
    days: [Number],
    startTime: String,
    endTime: String,
  },

  fallbackGroup: String,

  delivery: {
    provider: {
      type: String,
      enum: ['ghl', 'webhook', 'email', 'none'],
      default: 'none'
    },
    config: {
      webhookUrl: String,
      apiKey: String,
      locationId: String,
      customHeaders: mongoose.Schema.Types.Mixed,
    },
  },

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
  createdAt: { type: Date, default: Date.now }
});

clientSchema.index({ tenantId: 1, state: 1 });
clientSchema.index({ tenantId: 1, status: 1 });
clientSchema.index({ tenantId: 1, allowedStates: 1 });
clientSchema.index({ tenantId: 1, isPaused: 1 });
clientSchema.index({ tenantId: 1, fallbackGroup: 1 });
clientSchema.index({ tenantId: 1, status: 1, routingMode: 1 });

clientSchema.pre('save', function(next) {
  if (this.leadsReceived >= this.leadCap) {
    this.status = 'full';
  } else if (this.status === 'full' && this.leadsReceived < this.leadCap) {
    this.status = 'active';
  }
  next();
});

module.exports = mongoose.model('Client', clientSchema);
