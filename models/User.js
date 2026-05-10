const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  phone: { type: String, trim: true },
  avatar: String,
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'Tenant is required']
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'Role is required']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending_verification'],
    default: 'pending_verification'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  mfaEnabled: { type: Boolean, default: false },
  mfaSecret: String,
  mfaBackupCodes: [String],
  refreshTokens: [{
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: Date,
    userAgent: String,
    ipAddress: String,
    revoked: { type: Boolean, default: false },
    revokedAt: Date
  }],
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  lockReason: String,
  lastLogin: Date,
  lastLoginIP: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastPasswordChange: Date
}, { timestamps: true });

userSchema.index({ username: 1, tenantId: 1 }, { unique: true });
userSchema.index({ email: 1 });
userSchema.index({ tenantId: 1, status: 1 });
userSchema.index({ tenantId: 1, role: 1 });
userSchema.index({ lockUntil: 1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.lastPasswordChange) {
    this.lastPasswordChange = new Date();
  }
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.incLoginAttempts = function() {
  const updates = { $inc: { failedLoginAttempts: 1 } };

  if (this.failedLoginAttempts + 1 >= 5 && (!this.lockUntil || this.lockUntil < Date.now())) {
    updates.$set = {
      lockUntil: Date.now() + 2 * 60 * 60 * 1000,
      lockReason: 'Too many failed login attempts'
    };
  }

  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { lastLogin: new Date() },
    $unset: { failedLoginAttempts: 1, lockUntil: 1, lockReason: 1 }
  });
};

userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.generateEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = token;
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return token;
};

userSchema.methods.generatePasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = token;
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  return token;
};

userSchema.methods.revokeRefreshToken = function(token) {
  const tokenDoc = this.refreshTokens.id(token);
  if (tokenDoc) {
    tokenDoc.revoked = true;
    tokenDoc.revokedAt = new Date();
  }
  return this.save();
};

userSchema.methods.rotateRefreshToken = function(oldToken, newTokenData) {
  const tokenDoc = this.refreshTokens.find(t => t.token === oldToken);
  if (tokenDoc) {
    tokenDoc.token = newTokenData.token;
    tokenDoc.expiresAt = newTokenData.expiresAt;
  } else {
    this.refreshTokens.push(newTokenData);
  }
  return this.save();
};

userSchema.methods.expireOldRefreshTokens = function() {
  this.refreshTokens = this.refreshTokens.filter(t =>
    !t.revoked && t.expiresAt > new Date()
  );
  return this.save();
};

userSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.refreshTokens;
    delete ret.emailVerificationToken;
    delete ret.passwordResetToken;
    delete ret.mfaSecret;
    delete ret.mfaBackupCodes;
    return ret;
  }
});

userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
