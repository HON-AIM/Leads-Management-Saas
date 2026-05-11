const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Role = require('../models/Role');
const { generateAccessToken, generateRefreshToken } = require('../middleware/auth');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAccountLockedEmail
} = require('./emailService');
const AuditLogService = require('./auditLogService');
const crypto = require('crypto');

class AuthService {
  static async register(userData, tenantId) {
    const { username, email, password, firstName, lastName, roleId } = userData;

    const existingUser = await User.findOne({
      $or: [{ email }, { username, tenantId }]
    });

    if (existingUser) {
      throw new Error('User already exists with this email or username');
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    let role = null;
    if (roleId) {
      role = await Role.findOne({ _id: roleId, $or: [{ tenantId }, { tenantId: null }] });
    }
    if (!role) {
      role = await Role.findOne({ name: tenant.settings.defaultRole || 'buyer', tenantId: null });
    }
    if (!role) throw new Error('Default role not configured');

    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      tenantId,
      role: role._id
    });

    if (tenant.settings.requireEmailVerification) {
      user.emailVerificationToken = crypto.randomBytes(32).toString('hex');
      user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      user.status = 'pending_verification';
    } else {
      user.emailVerified = true;
      user.status = 'active';
    }

    await user.save();

    if (tenant.settings.requireEmailVerification) {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${user.emailVerificationToken}`;
      await sendVerificationEmail(user, verificationUrl);
    }

    await AuditLogService.log({
      action: 'user_created',
      resource: 'user',
      resourceId: user._id,
      performedBy: userData.createdBy || user._id,
      tenantId,
      details: { username, email },
      message: `User ${username} registered`
    });

    return {
      userId: user._id,
      message: tenant.settings.requireEmailVerification
        ? 'User registered successfully. Please check your email to verify your account.'
        : 'User registered successfully.'
    };
  }

  static async verifyEmail(token) {
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    user.emailVerified = true;
    user.status = 'active';
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    await AuditLogService.log({
      action: 'email_verified',
      resource: 'auth',
      performedBy: user._id,
      tenantId: user.tenantId,
      message: `Email verified for user ${user.username}`
    });

    return { message: 'Email verified successfully' };
  }

  static async login(username, password, userAgent, ipAddress) {
    const user = await User.findOne({ username }).select('+password').populate('role').populate('tenantId');

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (user.isLocked()) {
      await AuditLogService.log({
        action: 'permission_denied',
        resource: 'auth',
        performedBy: user._id,
        tenantId: user.tenantId._id,
        ipAddress,
        status: 'failure',
        message: 'Login attempt on locked account'
      });
      throw new Error('Account is locked due to too many failed login attempts');
    }

    if (user.status === 'pending_verification') {
      throw new Error('Please verify your email before logging in');
    }

    if (user.status !== 'active') {
      throw new Error('Account is not active');
    }

    if (user.tenantId.status !== 'active') {
      throw new Error('Your organization account is not active');
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      await user.incLoginAttempts();

      await AuditLogService.log({
        action: 'failed_login',
        resource: 'auth',
        performedBy: user._id,
        tenantId: user.tenantId._id,
        ipAddress,
        userAgent,
        status: 'failure',
        message: 'Invalid password'
      });

      if (user.failedLoginAttempts + 1 >= 5) {
        await sendAccountLockedEmail(user);
        await AuditLogService.log({
          action: 'account_locked',
          resource: 'auth',
          performedBy: user._id,
          tenantId: user.tenantId._id,
          message: 'Account locked due to too many failed attempts'
        });
      }

      throw new Error('Invalid credentials');
    }

    await user.resetLoginAttempts();

    const accessToken = generateAccessToken(user._id, user.role.name);
    const refreshToken = generateRefreshToken(user._id);

    const refreshTokenDoc = {
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent,
      ipAddress
    };

    user.refreshTokens.push(refreshTokenDoc);
    user.lastLogin = new Date();
    user.lastLoginIP = ipAddress;
    await user.save();

    await AuditLogService.log({
      action: 'login',
      resource: 'auth',
      performedBy: user._id,
      tenantId: user.tenantId._id,
      ipAddress,
      userAgent,
      message: `User ${user.username} logged in`
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
        tenantId: user.tenantId._id,
        tenantName: user.tenantId.name,
        tenantSlug: user.tenantId.slug
      }
    };
  }

  static async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.userId).populate('role').populate('tenantId');

      if (!user) throw new Error('User not found');
      if (user.status !== 'active') throw new Error('User account is not active');

      const tokenDoc = user.refreshTokens.find(t => t.token === refreshToken && !t.revoked);
      if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
        throw new Error('Invalid or revoked refresh token');
      }

      const oldToken = tokenDoc.token;
      const newAccessToken = generateAccessToken(user._id, user.role.name);
      const newRefreshToken = generateRefreshToken(user._id);

      tokenDoc.token = newRefreshToken;
      tokenDoc.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await user.save();

      await AuditLogService.log({
        action: 'token_refreshed',
        resource: 'auth',
        performedBy: user._id,
        tenantId: user.tenantId._id,
        ipAddress: tokenDoc.ipAddress,
        message: `Token refreshed for user ${user.username}`
      });

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      if (error.message === 'Invalid or revoked refresh token') {
        throw error;
      }
      throw new Error('Invalid refresh token');
    }
  }

  static async logout(userId, refreshToken) {
    const user = await User.findById(userId);
    if (user) {
      user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
      await user.save();

      await AuditLogService.log({
        action: 'logout',
        resource: 'auth',
        performedBy: userId,
        tenantId: user.tenantId,
        message: `User logged out`
      });
    }
    return { message: 'Logged out successfully' };
  }

  static async logoutAll(userId) {
    const user = await User.findById(userId);
    if (user) {
      user.refreshTokens = [];
      await user.save();

      await AuditLogService.log({
        action: 'logout',
        resource: 'auth',
        performedBy: userId,
        tenantId: user.tenantId,
        message: `User logged out from all devices`
      });
    }
    return { message: 'Logged out from all devices successfully' };
  }

  static async revokeToken(userId, refreshToken) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const tokenDoc = user.refreshTokens.find(t => t.token === refreshToken);
    if (!tokenDoc) throw new Error('Token not found');

    tokenDoc.revoked = true;
    tokenDoc.revokedAt = new Date();
    await user.save();

    await AuditLogService.log({
      action: 'token_revoked',
      resource: 'auth',
      performedBy: userId,
      tenantId: user.tenantId,
      message: `Refresh token revoked`
    });

    return { message: 'Token revoked successfully' };
  }

  static async requestPasswordReset(email) {
    const user = await User.findOne({ email });
    if (!user) {
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await sendPasswordResetEmail(user, resetUrl);

    await AuditLogService.log({
      action: 'password_reset',
      resource: 'auth',
      performedBy: user._id,
      tenantId: user.tenantId,
      message: `Password reset requested for ${user.email}`
    });

    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }

  static async resetPassword(token, newPassword) {
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    }).select('+password');

    if (!user) throw new Error('Invalid or expired reset token');

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = [];
    await user.save();

    await AuditLogService.log({
      action: 'password_reset',
      resource: 'auth',
      performedBy: user._id,
      tenantId: user.tenantId,
      message: `Password reset completed for ${user.email}`
    });

    return { message: 'Password reset successfully' };
  }

  static async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password').populate('tenantId');
    if (!user) throw new Error('User not found');

    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) throw new Error('Current password is incorrect');

    user.password = newPassword;
    user.refreshTokens = [];
    await user.save();

    await AuditLogService.log({
      action: 'password_change',
      resource: 'auth',
      performedBy: user._id,
      tenantId: user.tenantId._id,
      message: `Password changed for ${user.username}`
    });

    return { message: 'Password changed successfully' };
  }

  static async resendVerificationEmail(userId) {
    const user = await User.findById(userId).populate('tenantId');
    if (!user) throw new Error('User not found');
    if (user.emailVerified) throw new Error('Email already verified');

    const token = user.generateEmailVerificationToken();
    await user.save();

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
    await sendVerificationEmail(user, verificationUrl);

    return { message: 'Verification email sent' };
  }

  static async unlockAccount(userId, adminUserId) {
    const user = await User.findById(userId).populate('tenantId');
    if (!user) throw new Error('User not found');

    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lockReason = undefined;
    await user.save();

    await AuditLogService.log({
      action: 'user_updated',
      resource: 'user',
      resourceId: user._id,
      performedBy: adminUserId,
      tenantId: user.tenantId._id,
      message: `Account unlocked for ${user.username} by admin`
    });

    return { message: 'Account unlocked successfully' };
  }

  static async getActiveSessions(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    return user.refreshTokens
      .filter(t => !t.revoked && t.expiresAt > new Date())
      .map(t => ({
        createdAt: t.createdAt,
        expiresAt: t.expiresAt,
        userAgent: t.userAgent,
        ipAddress: t.ipAddress
      }));
  }
}

module.exports = AuthService;
