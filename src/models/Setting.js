const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },

    dedupWindowHours: { type: Number, default: 720, min: 1 },
    defaultRoutingMode: {
      type: String,
      enum: ['round_robin', 'weighted', 'priority', 'exclusive'],
      default: 'round_robin',
    },

    deliveryTimeout: { type: Number, default: 30000 },
    maxRetries: { type: Number, default: 3 },

    businessHours: {
      enabled: { type: Boolean, default: false },
      timezone: { type: String, default: 'America/New_York' },
      days: { type: [Number], default: [1, 2, 3, 4, 5] },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '17:00' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
