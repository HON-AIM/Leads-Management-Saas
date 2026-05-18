const User = require('../models/User');
const Role = require('../models/Role');
const Tenant = require('../models/Tenant');
const AuthService = require('./authService');
const AuditLogService = require('./auditLogService');

class UserService {
  static async createUser(userData, tenantId, createdBy) {
    const { username, email, password, firstName, lastName, roleId } = userData;

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const userCount = await User.countDocuments({ tenantId, status: { $ne: 'inactive' } });
    if (userCount >= tenant.settings.maxUsers) {
      throw new Error('Maximum number of users reached for this tenant');
    }

    let role = null;
    if (roleId) {
      role = await Role.findOne({ _id: roleId, $or: [{ tenantId }, { tenantId: null }] });
    }
    if (!role) {
      role = await Role.findOne({ name: tenant.settings.defaultRole || 'buyer', tenantId: null });
    }
    if (!role) throw new Error('Default role not configured');

    const existingUser = await User.findOne({
      $or: [{ email }, { username, tenantId }]
    });
    if (existingUser) throw new Error('User already exists with this email or username');

    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      tenantId,
      role: role._id,
      createdBy,
      status: tenant.settings.requireEmailVerification ? 'pending_verification' : 'active',
      emailVerified: !tenant.settings.requireEmailVerification
    });

    if (tenant.settings.requireEmailVerification) {
      const crypto = require('crypto');
      user.emailVerificationToken = crypto.randomBytes(32).toString('hex');
      user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    await user.save();

    await AuditLogService.log({
      action: 'user_created',
      resource: 'user',
      resourceId: user._id,
      performedBy: createdBy,
      tenantId,
      details: { username, email, role: role.name },
      message: `User ${username} created by admin`
    });

    return {
      userId: user._id,
      username: user.username,
      email: user.email,
      message: tenant.settings.requireEmailVerification
        ? 'User created. Verification email sent.'
        : 'User created successfully.'
    };
  }

  static async getUsersInTenant(tenantId, filters = {}, pagination = {}) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const query = { tenantId };
    if (filters.status) query.status = filters.status;
    if (filters.role) query.role = filters.role;

    const [users, total] = await Promise.all([
      User.find(query)
        .populate('role', 'name description')
        .select('-password -refreshTokens -passwordResetToken -emailVerificationToken -mfaSecret -mfaBackupCodes')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);

    return {
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }

  static async getUserById(userId, tenantId) {
    const user = await User.findOne({ _id: userId, tenantId })
      .populate('role', 'name description')
      .populate('tenantId', 'name domain')
      .select('-password -refreshTokens -passwordResetToken -emailVerificationToken -mfaSecret -mfaBackupCodes');

    if (!user) throw new Error('User not found');
    return user;
  }

  static async updateUser(userId, tenantId, updateData, currentUserId) {
    const user = await User.findOne({ _id: userId, tenantId }).select('+password');
    if (!user) throw new Error('User not found');

    const currentUser = await User.findById(currentUserId).populate('role');
    const canUpdate = currentUser.role?.name === 'super_admin' ||
                      currentUser.role?.name === 'tenant_admin' ||
                      currentUserId === userId;

    if (!canUpdate) throw new Error('Insufficient permissions');

    if (updateData.role && currentUser.role?.name !== 'super_admin') {
      const newRole = await Role.findById(updateData.role);
      if (newRole?.name === 'super_admin') throw new Error('Cannot assign super_admin role');
      if (newRole?.tenantId && newRole.tenantId.toString() !== tenantId.toString()) {
        throw new Error('Cannot assign role from another tenant');
      }
    }

    const protectedFields = ['password', 'refreshTokens', 'tenantId', 'email'];
    for (const field of protectedFields) {
      delete updateData[field];
    }

    Object.assign(user, updateData);
    await user.save();

    await AuditLogService.log({
      action: 'user_updated',
      resource: 'user',
      resourceId: user._id,
      performedBy: currentUserId,
      tenantId,
      details: { fields: Object.keys(updateData) },
      message: `User ${user.username} updated`
    });

    return await this.getUserById(userId, tenantId);
  }

  static async deleteUser(userId, tenantId, currentUserId) {
    const user = await User.findOne({ _id: userId, tenantId });
    if (!user) throw new Error('User not found');

    if (currentUserId.toString() === userId.toString()) throw new Error('Cannot delete your own account');

    const currentUser = await User.findById(currentUserId).populate('role');
    const canDelete = currentUser.role?.name === 'super_admin' ||
                      currentUser.role?.name === 'tenant_admin';

    if (!canDelete) throw new Error('Insufficient permissions');

    await User.findByIdAndDelete(userId);

    await AuditLogService.log({
      action: 'user_deleted',
      resource: 'user',
      resourceId: user._id,
      performedBy: currentUserId,
      tenantId,
      message: `User ${user.username} deleted`
    });

    return { message: 'User deleted successfully' };
  }

  static async setUserStatus(userId, tenantId, status, currentUserId) {
    const user = await User.findOne({ _id: userId, tenantId });
    if (!user) throw new Error('User not found');

    const validStatuses = ['active', 'inactive', 'suspended', 'pending_verification'];
    if (!validStatuses.includes(status)) throw new Error('Invalid status');

    const currentUser = await User.findById(currentUserId).populate('role');
    const canManage = currentUser.role?.name === 'super_admin' ||
                      currentUser.role?.name === 'tenant_admin';

    if (!canManage) throw new Error('Insufficient permissions');

    user.status = status;
    await user.save();

    await AuditLogService.log({
      action: 'user_suspended',
      resource: 'user',
      resourceId: user._id,
      performedBy: currentUserId,
      tenantId,
      details: { status },
      message: `User ${user.username} status changed to ${status}`
    });

    return await this.getUserById(userId, tenantId);
  }

  static async resetUserPassword(userId, tenantId, newPassword, currentUserId) {
    const user = await User.findOne({ _id: userId, tenantId }).select('+password');
    if (!user) throw new Error('User not found');

    const currentUser = await User.findById(currentUserId).populate('role');
    const canReset = currentUser.role?.name === 'super_admin' ||
                     currentUser.role?.name === 'tenant_admin';

    if (!canReset) throw new Error('Insufficient permissions');

    user.password = newPassword;
    user.refreshTokens = [];
    await user.save();

    await AuthService.logoutAll(userId);

    await AuditLogService.log({
      action: 'password_reset',
      resource: 'auth',
      performedBy: currentUserId,
      tenantId,
      resourceId: user._id,
      message: `Password reset for ${user.username} by admin`
    });

    return { message: 'Password reset successfully' };
  }

  static async getUserProfile(userId) {
    const user = await User.findById(userId)
      .populate('role', 'name description')
      .populate('tenantId', 'name slug domain')
      .select('-password -refreshTokens -passwordResetToken -emailVerificationToken -mfaSecret -mfaBackupCodes');

    if (!user) throw new Error('User not found');
    return user;
  }

  static async updateUserProfile(userId, updateData) {
    const user = await User.findById(userId).select('+password');
    if (!user) throw new Error('User not found');

    const allowedFields = ['firstName', 'lastName', 'phone'];
    for (const field of Object.keys(updateData)) {
      if (allowedFields.includes(field)) {
        user[field] = updateData[field];
      }
    }

    await user.save();
    return await this.getUserProfile(userId);
  }

  static async listActiveUsers(tenantId, limit = 100) {
    return User.find({ tenantId, status: 'active' })
      .populate('role', 'name')
      .select('username email firstName lastName lastLogin')
      .sort({ lastLogin: -1 })
      .limit(limit);
  }
}

module.exports = UserService;
