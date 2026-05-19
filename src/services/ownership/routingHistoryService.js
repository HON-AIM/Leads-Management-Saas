const LeadRoutingHistory = require('../../../models/LeadRoutingHistory');
const { getLogger } = require('../../utils/logger');

const logger = getLogger('RoutingHistoryService');

class RoutingHistoryService {
  static async recordRoutingEvent({ leadId, eventType, fromOwnerId = null, fromOwnerName = null, toBuyerId = null, toBuyerName = null, toBuyerEmail = null, toBuyerGhlUserId = null, routingMethod = 'round_robin', routingReason = '', routingPriority = 0, campaignId = '', campaignName = '', supplierId = '', sourcePlatform = 'form', destinationPlatform = '', leadState = '', leadCountry = '', leadEmail = '', systemNotes = '', performedBy = 'system', performedByUserId = null, metadata = null, tenantId }) {
    const missing = [];
    if (!leadId) missing.push('leadId');
    if (!eventType) missing.push('eventType');
    if (!tenantId) missing.push('tenantId');
    if (missing.length) throw new Error(`recordRoutingEvent missing required fields: ${missing.join(', ')}`);

    const record = await LeadRoutingHistory.create({
      leadId,
      eventType,
      fromOwnerId,
      fromOwnerName,
      toBuyerId,
      toBuyerName,
      toBuyerEmail,
      toBuyerGhlUserId,
      routingMethod,
      routingReason,
      routingPriority,
      campaignId,
      campaignName,
      supplierId,
      sourcePlatform,
      destinationPlatform,
      leadState,
      leadCountry,
      leadEmail,
      systemNotes,
      performedBy,
      performedByUserId,
      metadata,
      tenantId,
    });

    logger.debug(`Routing event recorded: ${eventType} for lead ${leadId}`);
    return record;
  }

  static async getLeadHistory(leadId, { limit = 50, skip = 0 } = {}) {
    return LeadRoutingHistory.find({ leadId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  static async getLeadRoutingSummary(leadId) {
    const history = await LeadRoutingHistory.find({ leadId })
      .sort({ createdAt: -1 })
      .lean();

    const summary = {
      totalEvents: history.length,
      assignments: history.filter(e => e.eventType === 'assigned').length,
      reassignments: history.filter(e => e.eventType === 'reassigned' || e.eventType === 'ownership_transferred').length,
      failures: history.filter(e => e.eventType.includes('failed')).length,
      firstAssignedAt: null,
      latestAssignedAt: null,
      buyers: [],
    };

    const assigned = history.filter(e => e.eventType === 'assigned' || e.eventType === 'reassigned');
    if (assigned.length > 0) {
      summary.firstAssignedAt = assigned[assigned.length - 1]?.createdAt;
      summary.latestAssignedAt = assigned[0]?.createdAt;
      summary.buyers = [...new Set(assigned.map(e => e.toBuyerName).filter(Boolean))];
    }

    return summary;
  }

  static async getByTenant(tenantId, { eventType = null, limit = 100, skip = 0 } = {}) {
    const filter = { tenantId };
    if (eventType) filter.eventType = eventType;
    return LeadRoutingHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }
}

module.exports = RoutingHistoryService;
