const LeadAssignment = require('../models/LeadAssignment');

class LeadAssignmentRepository {
  async create(data) {
    return LeadAssignment.create(data);
  }

  async findByLead(leadId, tenantId) {
    return LeadAssignment.findOne({ leadId, tenantId }).populate('buyerId', 'name email');
  }

  async findByLeadIds(leadIds, tenantId) {
    if (!leadIds.length) return [];
    return LeadAssignment.find({ leadId: { $in: leadIds }, tenantId })
      .populate('buyerId', 'name email')
      .lean();
  }

  async findByBuyer(buyerId, tenantId, { page = 1, limit = 25 } = {}) {
    const query = { buyerId, tenantId };
    const [assignments, total] = await Promise.all([
      LeadAssignment.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('leadId', 'name email phone state source status createdAt')
        .lean(),
      LeadAssignment.countDocuments(query),
    ]);
    return { assignments, total, page, pages: Math.ceil(total / limit) };
  }

  async findInTenant(tenantId, { page = 1, limit = 50, status, buyerId, startDate, endDate } = {}) {
    const query = { tenantId };
    if (status) query.status = status;
    if (buyerId) query.buyerId = buyerId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    const [assignments, total] = await Promise.all([
      LeadAssignment.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('leadId', 'name email phone state source status createdAt')
        .populate('buyerId', 'name email')
        .lean(),
      LeadAssignment.countDocuments(query),
    ]);
    return { assignments, total, page, pages: Math.ceil(total / limit) };
  }

  async updateStatus(id, status, extra = {}) {
    const update = { status, ...extra };
    if (status === 'delivered') update.deliveredAt = new Date();
    return LeadAssignment.findByIdAndUpdate(id, update, { new: true });
  }

  async getStats(tenantId) {
    return LeadAssignment.aggregate([
      { $match: { tenantId: require('mongoose').Types.ObjectId.createFromHexString(typeof tenantId === 'string' ? tenantId : tenantId.toString()) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$revenue' },
          cost: { $sum: '$cost' },
        },
      },
    ]);
  }

  async getBuyerStats(tenantId) {
    return LeadAssignment.aggregate([
      { $match: { tenantId: require('mongoose').Types.ObjectId.createFromHexString(typeof tenantId === 'string' ? tenantId : tenantId.toString()) } },
      {
        $group: {
          _id: '$buyerId',
          total: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          revenue: { $sum: '$revenue' },
          cost: { $sum: '$cost' },
        },
      },
      { $sort: { total: -1 } },
    ]);
  }
}

module.exports = new LeadAssignmentRepository();
