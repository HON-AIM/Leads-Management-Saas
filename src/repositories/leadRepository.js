const Lead = require('../models/Lead');

class LeadRepository {
  async create(data) {
    return Lead.create(data);
  }

  async findById(id, tenantId) {
    return Lead.findOne({ _id: id, tenantId }).populate('campaignId', 'name');
  }

  async findInTenant(tenantId, { page = 1, limit = 50, status, state, source, campaignId, search, startDate, endDate, leadIds } = {}) {
    const query = { tenantId };
    if (leadIds) query._id = { $in: leadIds };
    if (status) query.status = status;
    if (state) query.state = state.toUpperCase();
    if (source) query.source = source;
    if (campaignId) query.campaignId = campaignId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } },
        { phone: { $regex: safe, $options: 'i' } },
      ];
    }
    const [leads, total] = await Promise.all([
      Lead.find(query).populate('campaignId', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Lead.countDocuments(query),
    ]);
    return { leads, total, page, pages: Math.ceil(total / limit) };
  }

  async findByBuyer(buyerId, tenantId, { page = 1, limit = 25, status } = {}) {
    const query = { tenantId, assignedBuyerId: buyerId };
    if (status) query.status = status;

    const LeadAssignment = require('./leadAssignment');
    const assignmentQuery = { buyerId, tenantId };
    const assignments = await LeadAssignment.find(assignmentQuery).select('leadId').lean();
    const leadIds = assignments.map((a) => a.leadId);

    const fullQuery = { ...query, _id: { $in: leadIds } };
    const [leads, total] = await Promise.all([
      Lead.find(fullQuery).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Lead.countDocuments(fullQuery),
    ]);
    return { leads, total, page, pages: Math.ceil(total / limit) };
  }

  async findDuplicate(emailNormalized, phoneNormalized, tenantId, windowHours, excludeLeadId) {
    const since = new Date(Date.now() - windowHours * 3600 * 1000);
    const query = { tenantId, createdAt: { $gte: since }, isDuplicate: false };
    if (excludeLeadId) query._id = { $ne: excludeLeadId };
    const conditions = [];
    if (emailNormalized) conditions.push({ emailNormalized });
    if (phoneNormalized) conditions.push({ phoneNormalized });
    if (!conditions.length) return null;
    query.$or = conditions;
    return Lead.findOne(query).sort({ createdAt: -1 });
  }

  async findByIdAndUpdate(id, tenantId, data) {
    return Lead.findOneAndUpdate({ _id: id, tenantId }, data, { new: true });
  }

  async findByIdAndDelete(id, tenantId) {
    return Lead.findOneAndDelete({ _id: id, tenantId });
  }

  async countByStatus(tenantId) {
    return Lead.aggregate([
      { $match: { tenantId: require('mongoose').Types.ObjectId.createFromHexString(typeof tenantId === 'string' ? tenantId : tenantId.toString()) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
  }

  async countToday(tenantId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Lead.countDocuments({ tenantId, createdAt: { $gte: today } });
  }

  async countInTenant(tenantId) {
    return Lead.countDocuments({ tenantId });
  }
}

module.exports = new LeadRepository();
