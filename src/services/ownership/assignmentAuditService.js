const OwnershipAudit = require('../../../models/OwnershipAudit');
const { getLogger } = require('../../utils/logger');

const logger = getLogger('AssignmentAuditService');

class AssignmentAuditService {
  static async logAssignmentEvent({ leadId, tenantId, eventType, previousOwnerId = null, previousOwnerName = null, newOwnerId = null, newOwnerName = null, newOwnerEmail = null, routingMethod = 'round_robin', routingReason = '', campaignId = '', campaignName = '', sourcePlatform = 'form', performedBy = 'system', performedByUserId = null, notes = '', metadata = null, ipAddress = '', userAgent = '' }) {
    const audit = await OwnershipAudit.create({
      leadId,
      tenantId,
      eventType,
      previousOwnerId,
      previousOwnerName,
      newOwnerId,
      newOwnerName,
      newOwnerEmail,
      routingMethod,
      routingReason,
      campaignId,
      campaignName,
      sourcePlatform,
      performedBy,
      performedByUserId,
      notes,
      metadata,
      ipAddress,
      userAgent,
    });

    logger.debug(`Audit event logged: ${eventType} for lead ${leadId}`);
    return audit;
  }

  static async getAuditTrail(leadId, { limit = 50, skip = 0 } = {}) {
    return OwnershipAudit.find({ leadId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  static async getOwnershipAudit(tenantId, { eventType = null, limit = 50, skip = 0, startDate = null, endDate = null } = {}) {
    const filter = { tenantId };
    if (eventType) filter.eventType = eventType;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    return OwnershipAudit.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  static async getRecentByBuyer(buyerId, tenantId, { limit = 20 } = {}) {
    return OwnershipAudit.find({
      tenantId,
      $or: [{ newOwnerId: buyerId }, { previousOwnerId: buyerId }],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}

module.exports = AssignmentAuditService;
