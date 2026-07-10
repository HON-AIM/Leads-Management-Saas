const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../config');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'manager', 'viewer'],
      default: 'viewer',
    },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    refreshTokens: [
      {
        token: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    apiKey: { type: String, unique: true, sparse: true, select: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ email: 1, tenantId: 1 }, { unique: true });
userSchema.index({ tenantId: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, config.security.bcryptRounds);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isLocked = function () {
  return this.lockedUntil && this.lockedUntil > Date.now();
};

userSchema.methods.incrementFailedAttempts = async function () {
  if (this.failedLoginAttempts === 0) {
    this.lockedUntil = new Date(Date.now() + config.security.lockTimeMinutes * 60 * 1000);
  }
  this.failedLoginAttempts += 1;
  await this.save();
};

userSchema.methods.resetFailedAttempts = async function () {
  this.failedLoginAttempts = 0;
  this.lockedUntil = undefined;
  await this.save();
};

userSchema.methods.generateRefreshToken = function () {
  const token = crypto.randomBytes(40).toString('hex');
  this.refreshTokens.push({ token });
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
  return token;
};

userSchema.methods.removeRefreshToken = function (token) {
  this.refreshTokens = this.refreshTokens.filter((t) => t.token !== token);
};

userSchema.methods.removeAllRefreshTokens = function () {
  this.refreshTokens = [];
};

module.exports = mongoose.model('User', userSchema);
