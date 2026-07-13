const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String },
    phoneNormalized: { type: String },
    emailNormalized: { type: String },
    state: { type: String, uppercase: true, trim: true },
    source: { type: String, default: 'form' },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },

    status: {
      type: String,
      enum: ['new', 'assigned', 'delivered', 'failed', 'duplicate', 'unassigned'],
      default: 'new',
    },

    isDuplicate: { type: Boolean, default: false },
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },

    revenue: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },

    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rawPayload: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

leadSchema.index({ tenantId: 1, emailNormalized: 1, createdAt: -1 });
leadSchema.index({ tenantId: 1, phoneNormalized: 1, createdAt: -1 });
leadSchema.index({ tenantId: 1, status: 1 });
leadSchema.index({ tenantId: 1, state: 1 });
leadSchema.index({ tenantId: 1, campaignId: 1 });
leadSchema.index({ tenantId: 1, createdAt: -1 });
leadSchema.index({ tenantId: 1, source: 1 });
leadSchema.index({ tenantId: 1, supplierId: 1 });

leadSchema.pre('save', function (next) {
  if (this.email && !this.emailNormalized) {
    this.emailNormalized = this.email.toLowerCase().trim();
  }
  if (this.phone && !this.phoneNormalized) {
    const digits = this.phone.replace(/\D/g, '');
    this.phoneNormalized = digits.length >= 10 ? digits.slice(-10) : digits;
  }
  next();
});

module.exports = mongoose.model('Lead', leadSchema);
