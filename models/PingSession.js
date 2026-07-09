const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  buyerName: String,
  amount: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'auto'],
    default: 'pending',
  },
  source: { type: String, enum: ['auto', 'api', 'webhook'], default: 'api' },
  respondedAt: { type: Date, default: Date.now },
}, { _id: true });

const pingSessionSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  campaignName: String,

  status: {
    type: String,
    enum: ['pending', 'bidding', 'won', 'expired', 'posted', 'failed', 'no_bids'],
    default: 'pending',
    index: true,
  },

  pingPayload: {
    state: String,
    country: String,
    source: String,
    campaign: String,
    hasPhone: Boolean,
    hasEmail: Boolean,
    zip: String,
  },

  bids: [bidSchema],
  winnerBuyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  winningBid: { type: Number, default: 0 },

  invitedBuyerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }],
  expiresAt: { type: Date, index: true },
  resolvedAt: Date,
  postedAt: Date,
}, { timestamps: true });

pingSessionSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('PingSession', pingSessionSchema);
