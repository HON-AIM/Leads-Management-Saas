const RoutingLog = require('../models/RoutingLog');

class RoutingLogRepository {
  async create(data) {
    return RoutingLog.create(data);
  }

  async findInTenant(tenantId, { page = 1, limit = 50 } = {}) {
    const query = { tenantId };
    const [logs, total] = await Promise.all([
      RoutingLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('leadId', 'name email state source')
        .populate('selectedBuyerId', 'name email')
        .lean(),
      RoutingLog.countDocuments(query),
    ]);
    return { logs, total, page, pages: Math.ceil(total / limit) };
  }

  async findByLead(leadId) {
    return RoutingLog.find({ leadId }).sort({ createdAt: -1 }).lean();
  }

  async getStats(tenantId) {
    return RoutingLog.aggregate([
      { $match: { tenantId: require('mongoose').Types.ObjectId.createFromHexString(typeof tenantId === 'string' ? tenantId : tenantId.toString()) } },
      {
        $group: {
          _id: '$routingMode',
          count: { $sum: 1 },
          avgDuration: { $avg: '$durationMs' },
        },
      },
    ]);
  }
}

module.exports = new RoutingLogRepository();
