const AuditLog = require('../models/AuditLog');

class AuditLogService {
  static async log({ action, resource, resourceId, performedBy, tenantId, details, ipAddress, userAgent, status, message }) {
    try {
      return await AuditLog.create({
        action,
        resource,
        resourceId,
        performedBy,
        tenantId,
        details: details ? new Map(Object.entries(details)) : undefined,
        ipAddress,
        userAgent,
        status: status || 'success',
        message
      });
    } catch (error) {
      console.error('[AuditLog] Failed to create log entry:', error.message);
    }
  }

  static async getLogs(tenantId, filters = {}, pagination = {}) {
    const { page = 1, limit = 50 } = pagination;
    const skip = (page - 1) * limit;

    const query = { tenantId };
    if (filters.action) query.action = filters.action;
    if (filters.resource) query.resource = filters.resource;
    if (filters.performedBy) query.performedBy = filters.performedBy;
    if (filters.status) query.status = filters.status;
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const logs = await AuditLog.find(query)
      .populate('performedBy', 'username email firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AuditLog.countDocuments(query);

    return { logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  static async getRecentActivity(tenantId, limit = 20) {
    return AuditLog.find({ tenantId })
      .populate('performedBy', 'username firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  static async cleanupOldLogs(days = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return AuditLog.deleteMany({ createdAt: { $lt: cutoffDate } });
  }
}

module.exports = AuditLogService;
