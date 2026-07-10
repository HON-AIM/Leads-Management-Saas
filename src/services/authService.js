const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');
const logger = require('../utils/logger');

class AuthService {
  async login(email, password, tenantId) {
    const user = await User.findOne({ email, tenantId }).select('+password').populate('tenantId', 'name slug status');
    if (!user) throw new Error('Invalid credentials');
    if (user.status !== 'active') throw new Error('Account is inactive');
    if (user.isLocked()) throw new Error('Account is locked — try again later');

    const valid = await user.comparePassword(password);
    if (!valid) {
      await user.incrementFailedAttempts();
      throw new Error('Invalid credentials');
    }
    await user.resetFailedAttempts();

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshTokens.push({ token: refreshToken, createdAt: new Date() });
    await user.save();

    return {
      user: { id: user._id, name: user.name, email: user.email, role: user.role, tenant: user.tenantId },
      accessToken,
      refreshToken,
    };
  }

  async register(data) {
    const user = await User.create(data);
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshTokens.push({ token: refreshToken, createdAt: new Date() });
    await user.save();
    return { user, accessToken, refreshToken };
  }

  async refresh(refreshToken) {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId).select('+refreshTokens');
    if (!user) throw new Error('User not found');
    const stored = user.refreshTokens.find((t) => t.token === refreshToken);
    if (!stored) {
      user.refreshTokens = [];
      await user.save();
      throw new Error('Invalid refresh token');
    }
    const newAccess = generateAccessToken(user);
    const newRefresh = generateRefreshToken(user);
    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== refreshToken);
    user.refreshTokens.push({ token: newRefresh, createdAt: new Date() });
    await user.save();
    return { accessToken: newAccess, refreshToken: newRefresh };
  }

  async logout(userId, refreshToken) {
    const user = await User.findById(userId).select('+refreshTokens');
    if (user) {
      user.refreshTokens = user.refreshTokens.filter((t) => t.token !== refreshToken);
      await user.save();
    }
  }
}

module.exports = new AuthService();
