const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tenant name is required'],
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Invalid slug format']
  },
  domain: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  description: { type: String, maxlength: 500 },
  status: {
    type: String,
    enum: ['active', 'suspended', 'inactive', 'pending'],
    default: 'pending'
  },
  settings: {
    maxUsers: { type: Number, default: 10 },
    maxLeadsPerMonth: { type: Number, default: 1000 },
    features: {
      emailNotifications: { type: Boolean, default: true },
      advancedAnalytics: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false },
      sso: { type: Boolean, default: false }
    },
    defaultRole: {
      type: String,
      default: 'buyer',
      enum: ['super_admin', 'tenant_admin', 'buyer', 'viewer']
    },
    requireEmailVerification: { type: Boolean, default: true },
    sessionTimeout: { type: Number, default: 60 },
    mfaRequired: { type: Boolean, default: false }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    trialEndsAt: Date,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    expiresAt: Date,
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    cancelAtPeriodEnd: { type: Boolean, default: false }
  },
  branding: {
    logoUrl: String,
    primaryColor: { type: String, default: '#2563eb' },
    companyName: String
  },
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  suspendedAt: Date,
  suspendedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  suspensionReason: String,
  lastLoginAt: Date,
  metadata: {
    type: Map,
    of: String
  }
}, { timestamps: true });

tenantSchema.index({ slug: 1 });
tenantSchema.index({ domain: 1 });
tenantSchema.index({ status: 1 });
tenantSchema.index({ 'subscription.plan': 1 });
tenantSchema.index({ createdAt: -1 });

tenantSchema.methods.isActive = function() {
  return this.status === 'active';
};

tenantSchema.methods.isSuspended = function() {
  return this.status === 'suspended';
};

tenantSchema.methods.hasFeature = function(feature) {
  return this.settings?.features?.[feature] === true;
};

tenantSchema.methods.isTrialExpired = function() {
  return this.subscription?.trialEndsAt && this.subscription.trialEndsAt < new Date();
};

tenantSchema.methods.isSubscriptionActive = function() {
  if (!this.subscription?.expiresAt) return true;
  return this.subscription.expiresAt > new Date();
};

tenantSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  next();
});

module.exports = mongoose.model('Tenant', tenantSchema);
