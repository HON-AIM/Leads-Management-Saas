const mongoose = require('mongoose');

const normalizationRunSchema = new mongoose.Schema({
  tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  run_id: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ['running', 'completed', 'failed'],
    default: 'running',
  },
  total_processed: { type: Number, default: 0 },
  normalized: { type: Number, default: 0 },
  ambiguous: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  started_at: { type: Date, default: Date.now },
  completed_at: Date,
  error: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

normalizationRunSchema.index({ tenant_id: 1, started_at: -1 });

module.exports = mongoose.model('NormalizationRun', normalizationRunSchema);
