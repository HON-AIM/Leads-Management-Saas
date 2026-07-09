const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  normalizedEmail: { type: String, lowercase: true },
  normalizedPhone: String,
  isDuplicate: { type: Boolean, default: false },
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
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },

  // Financial tracking (P&L)
  revenue: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  bidAmount: { type: Number, default: 0 },
  financialStatus: {
    type: String,
    enum: ['pending', 'accepted', 'returned'],
    default: 'pending',
  },
  pingSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PingSession' },

  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  status: {
    type: String,
    enum: ['assigned', 'unassigned', 'pending', 'contacted', 'converted', 'duplicate'],
    default: 'pending'
  },
  ingestionStatus: {
    type: String,
    enum: ['received', 'queued', 'routing', 'ping_pending', 'delivered', 'failed', 'duplicate', 'ambiguous'],
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

  // ── Ownership & Routing Metadata ─────────────────────────────────────────
  assignedBuyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  assignedBuyerName: String,
  assignedBuyerEmail: String,
  assignedBuyerGhlUserId: String,
  routingMethod: {
    type: String,
    enum: ['round_robin', 'weighted', 'priority', 'exclusive', 'ping_post', 'state_based', 'fallback', 'manual_reassign', 'api'],
    default: 'round_robin'
  },
  routingPriority: { type: Number, default: 0 },
  assignmentStatus: {
    type: String,
    enum: ['pending', 'assigned', 'reassigned', 'unassigned', 'failed'],
    default: 'pending'
  },
  assignedAt: Date,
  reassignedAt: Date,
  reassignmentCount: { type: Number, default: 0 },
  sourcePlatform: { type: String, default: 'form' },
  destinationPlatform: String,
  routingVersion: { type: String, default: '2.0' },

  externalReferences: {
    facebookLeadId: String,
    ghlContactId: String,
    ghlOpportunityId: String,
    externalCRMLeadId: String
  },

  ownershipMetadata: {
    currentOwnerType: {
      type: String,
      enum: ['buyer', 'system', 'unassigned'],
      default: 'unassigned'
    },
    currentOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client'
    },
    ownershipLocked: { type: Boolean, default: false },
    ownershipTransferredAt: Date,
    originalOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client'
    },
    originalOwnerName: String
  },

  deliveryMetadata: {
    lastDeliveryAttempt: Date,
    deliveryAttempts: { type: Number, default: 0 },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'delivering', 'delivered', 'failed', 'skipped'],
      default: 'pending'
    },
    lastDeliveryResult: String,
    lastSyncStatus: String,
    lastSyncAt: Date
  },

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
leadSchema.index({ tenantId: 1, assignedBuyerId: 1 });
leadSchema.index({ tenantId: 1, ingestionStatus: 1 });
leadSchema.index({ tenantId: 1, deliveryStatus: 1 });
leadSchema.index({ tenantId: 1, 'deliveryMetadata.deliveryStatus': 1 });
leadSchema.index({ tenantId: 1, email: 1, createdAt: -1 });
leadSchema.index({ tenantId: 1, phone: 1, createdAt: -1 });
leadSchema.index({ tenantId: 1, normalizedEmail: 1, createdAt: -1 });
leadSchema.index({ tenantId: 1, normalizedPhone: 1, createdAt: -1 });
leadSchema.index({ tenantId: 1, isDuplicate: 1, ingestionStatus: 1 });

leadSchema.pre('save', function setNormalizedDedupFields(next) {
  const { normalizeEmailForDedup, normalizePhoneForDedup } = require('../services/deduplicationService');
  if (this.email) this.normalizedEmail = normalizeEmailForDedup(this.email);
  if (this.phone) this.normalizedPhone = normalizePhoneForDedup(this.phone);
  next();
});
leadSchema.index({ tenantId: 1, campaign: 1 });
leadSchema.index({ tenantId: 1, normalized_country_code: 1, normalized_region_code: 1 });
leadSchema.index({ tenantId: 1, location_confidence_score: 1 });
leadSchema.index({ tenantId: 1, location_routable: 1 });
leadSchema.index({ normalized_region_code: 1, normalized_country_code: 1 });
leadSchema.index({ 'externalReferences.ghlContactId': 1 }, { sparse: true });
leadSchema.index({ 'externalReferences.facebookLeadId': 1 }, { sparse: true });
leadSchema.index({ assignmentStatus: 1, tenantId: 1 });
leadSchema.index({ 'ownershipMetadata.currentOwnerId': 1, tenantId: 1 });

module.exports = mongoose.model('Lead', leadSchema);
