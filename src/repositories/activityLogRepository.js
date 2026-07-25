const ActivityLog = require('../models/ActivityLog');

class ActivityLogRepository {
  async create(data) {
    return ActivityLog.create(data);
  }

  async findInTenant(tenantId, { page = 1, limit = 50, category } = {}) {
    const query = { tenantId };
    if (category) query.category = category;
    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(query),
    ]);
    return { logs, total, page, pages: Math.ceil(total / limit) };
  }
}

module.exports = new ActivityLogRepository();
