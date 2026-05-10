const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  state: { type: String, required: true },

  // ── Location Intelligence Fields ─────────────────────────────────────────
  raw_country: String,
  raw_state: String,
  raw_city: String,
  raw_postal: String,

  normalized_country_code: { type: String, uppercase: true, index: true },
  normalized_region_code: { type: String, uppercase: true, index: true },
  normalized_country_name: String,
  normalized_region_name: String,
  normalized_city: String,

  postal_code: String,
  phone_country_code: String,

  country_ambiguous: { type: Boolean, default: false },
  possible_countries: [String],

  location_confidence_score: { type: Number, min: 0, max: 1, default: 0 },
  location_confidence_level: String,
  location_routable: { type: Boolean, default: true },

  location_detection_methods: [String],
  location_enriched_at: Date,
  location_pipeline_duration_ms: Number,

  territory_match_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Territory' },
  territory_match_name: String,
  territory_match_score: Number,

  // ── Existing Fields ──────────────────────────────────────────────────────
  source: { type: String, default: 'form' },
  campaign: String,
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  status: {
    type: String,
    enum: ['assigned', 'unassigned', 'pending', 'contacted', 'converted'],
    default: 'pending'
  },
  ingestionStatus: {
    type: String,
    enum: ['received', 'queued', 'routing', 'delivered', 'failed', 'duplicate', 'ambiguous'],
    default: 'received'
  },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'delivering', 'delivered', 'failed', 'skipped'],
    default: 'pending'
  },
  deliveryAttempts: {
    type: Number,
    default: 0
  },
  lastDeliveryAttempt: Date,
  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  duplicateReason: String,
  notes: String,
  rawPayload: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,
  enrichedMetadata: mongoose.Schema.Types.Mixed,
  trackingMetadata: mongoose.Schema.Types.Mixed,
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

leadSchema.index({ tenantId: 1, state: 1 });
leadSchema.index({ tenantId: 1, status: 1 });
leadSchema.index({ tenantId: 1, assignedTo: 1 });
leadSchema.index({ tenantId: 1, ingestionStatus: 1 });
leadSchema.index({ tenantId: 1, deliveryStatus: 1 });
leadSchema.index({ tenantId: 1, email: 1, createdAt: -1 });
leadSchema.index({ tenantId: 1, phone: 1, createdAt: -1 });
leadSchema.index({ tenantId: 1, campaign: 1 });
leadSchema.index({ tenantId: 1, normalized_country_code: 1, normalized_region_code: 1 });
leadSchema.index({ tenantId: 1, location_confidence_score: 1 });
leadSchema.index({ tenantId: 1, location_routable: 1 });
leadSchema.index({ normalized_region_code: 1, normalized_country_code: 1 });

module.exports = mongoose.model('Lead', leadSchema);
