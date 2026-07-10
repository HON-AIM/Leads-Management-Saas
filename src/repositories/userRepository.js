const User = require('../models/User');

class UserRepository {
  async create(data) {
    return User.create(data);
  }

  async findById(id) {
    return User.findById(id).populate('tenantId', 'name slug status');
  }

  async findByEmailAndTenant(email, tenantId) {
    return User.findOne({ email, tenantId }).populate('tenantId', 'name slug status');
  }

  async findByEmailWithPassword(email, tenantId) {
    return User.findOne({ email, tenantId }).select('+password').populate('tenantId', 'name slug status');
  }

  async findInTenant(tenantId, filters = {}, { page = 1, limit = 50 } = {}) {
    const query = { tenantId, ...filters };
    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(query),
    ]);
    return { users, total, page, pages: Math.ceil(total / limit) };
  }

  async updateById(id, tenantId, data) {
    const allowed = ['name', 'email', 'role', 'status'];
    const update = {};
    for (const key of allowed) {
      if (data[key] !== undefined) update[key] = data[key];
    }
    return User.findOneAndUpdate({ _id: id, tenantId }, update, { new: true, runValidators: true });
  }

  async deleteById(id, tenantId) {
    return User.findOneAndDelete({ _id: id, tenantId });
  }

  async countInTenant(tenantId) {
    return User.countDocuments({ tenantId, status: 'active' });
  }

  async save(user) {
    return user.save();
  }
}

module.exports = new UserRepository();
