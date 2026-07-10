const Buyer = require('../models/Buyer');

class BuyerRepository {
  async create(data) {
    return Buyer.create(data);
  }

  async findById(id, tenantId) {
    return Buyer.findOne({ _id: id, tenantId });
  }

  async findInTenant(tenantId, { page = 1, limit = 50, status, search } = {}) {
    const query = { tenantId };
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const [buyers, total] = await Promise.all([
      Buyer.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Buyer.countDocuments(query),
    ]);
    return { buyers, total, page, pages: Math.ceil(total / limit) };
  }

  async findActiveInTenant(tenantId) {
    return Buyer.find({ tenantId, status: 'active' }).sort({ priority: -1, name: 1 });
  }

  async findByIdAndUpdate(id, tenantId, data) {
    return Buyer.findOneAndUpdate({ _id: id, tenantId }, data, { new: true, runValidators: true });
  }

  async findByIdAndDelete(id, tenantId) {
    return Buyer.findOneAndDelete({ _id: id, tenantId });
  }

  async incrementCaps(buyerId, tenantId) {
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const yearMonth = now.toISOString().slice(0, 7);
    return Buyer.findOneAndUpdate(
      { _id: buyerId, tenantId },
      {
        $inc: { leadsReceived: 1, dailyLeadsReceived: 1, monthlyLeadsReceived: 1 },
        $set: { lastAssignedAt: now },
      },
      { new: true }
    );
  }

  async resetCaps(buyerId, tenantId) {
    return Buyer.findOneAndUpdate(
      { _id: buyerId, tenantId },
      { $set: { leadsReceived: 0, dailyLeadsReceived: 0, monthlyLeadsReceived: 0 } },
      { new: true }
    );
  }

  async resetDailyCaps(tenantId) {
    return Buyer.updateMany({ tenantId }, { $set: { dailyLeadsReceived: 0 } });
  }

  async resetMonthlyCaps(tenantId) {
    return Buyer.updateMany({ tenantId }, { $set: { monthlyLeadsReceived: 0 } });
  }

  async save(buyer) {
    return buyer.save();
  }
}

module.exports = new BuyerRepository();
