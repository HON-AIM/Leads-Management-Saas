const mongoose = require('mongoose');

const analyticsCacheSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'realtime'],
    required: true
  },
  period: {
    type: String,
    required: true
  },
  data: mongoose.Schema.Types.Mixed,
  computedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, { timestamps: true });

analyticsCacheSchema.index({ tenantId: 1, type: 1, period: 1 }, { unique: true });
analyticsCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AnalyticsCache', analyticsCacheSchema);
