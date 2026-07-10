const Campaign = require('../models/Campaign');

class CampaignRepository {
  async create(data) {
    return Campaign.create(data);
  }

  async findById(id, tenantId) {
    return Campaign.findOne({ _id: id, tenantId }).populate('assignedBuyers.buyerId', 'name email status');
  }

  async findInTenant(tenantId, { page = 1, limit = 50, status } = {}) {
    const query = { tenantId };
    if (status) query.status = status;
    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('assignedBuyers.buyerId', 'name email status'),
      Campaign.countDocuments(query),
    ]);
    return { campaigns, total, page, pages: Math.ceil(total / limit) };
  }

  async findActiveInTenant(tenantId) {
    return Campaign.find({ tenantId, status: 'active' }).sort({ createdAt: 1 });
  }

  async findByIdAndUpdate(id, tenantId, data) {
    return Campaign.findOneAndUpdate({ _id: id, tenantId }, data, { new: true, runValidators: true });
  }

  async findByIdAndDelete(id, tenantId) {
    return Campaign.findOneAndDelete({ _id: id, tenantId });
  }

  async incrementRoundRobinIndex(id, tenantId, buyerCount) {
    if (buyerCount <= 0) return 0;
    const result = await Campaign.findOneAndUpdate(
      { _id: id, tenantId },
      [{ $set: { roundRobinIndex: { $mod: [{ $add: ['$roundRobinIndex', 1] }, buyerCount] } } }],
      { new: true }
    );
    return result ? result.roundRobinIndex : 0;
  }

  async incrementStats(id, tenantId, field) {
    return Campaign.findOneAndUpdate(
      { _id: id, tenantId },
      { $inc: { [field]: 1 } },
      { new: true }
    );
  }

  async save(campaign) {
    return campaign.save();
  }
}

module.exports = new CampaignRepository();
