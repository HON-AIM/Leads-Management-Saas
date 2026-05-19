const OwnershipService = require('./ownershipService');
const CrmSyncService = require('./crmSyncService');
const routingHistoryService = require('./routingHistoryService');
const AssignmentAuditService = require('./assignmentAuditService');
const Lead = require('../../../models/Lead');
const { getLogger } = require('../../utils/logger');

const logger = getLogger('ReassignmentService');

class ReassignmentService {
  static async reassignLead(leadId, newBuyer, { tenantId, reason = '', performedBy = 'system', performedByUserId = null, crmConfig = null }) {
    const lead = await Lead.findById(leadId)
      .select('assignedBuyerId assignedBuyerName assignedBuyerEmail assignmentStatus ownershipMetadata sourcePlatform campaign deliveryMetadata externalReferences');
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    const previousBuyerId = lead.assignedBuyerId;
    const previousBuyerName = lead.assignedBuyerName;

    await OwnershipService.transferOwnership(leadId, newBuyer, {
      tenantId,
      reason: reason || 'manual_reassign',
      performedBy,
      performedByUserId,
    });

    if (crmConfig) {
      try {
        await CrmSyncService.syncLeadToCrm(leadId, {
          platform: crmConfig.platform || 'GHL',
          syncType: 'update_contact',
          tenantId,
          buyerId: newBuyer._id,
          ghlApiKey: crmConfig.ghlApiKey,
          webhookUrl: crmConfig.webhookUrl,
        });
      } catch (err) {
        logger.error(`CRM sync failed during reassignment of lead ${leadId}`, { error: err.message });
      }
    }

    await AssignmentAuditService.logAssignmentEvent({
      leadId,
      tenantId,
      eventType: 'reassigned',
      previousOwnerId: previousBuyerId,
      previousOwnerName: previousBuyerName,
      newOwnerId: newBuyer._id,
      newOwnerName: newBuyer.name,
      newOwnerEmail: newBuyer.email || '',
      routingMethod: 'manual_reassign',
      routingReason: reason,
      campaignId: lead.campaign,
      sourcePlatform: lead.sourcePlatform || 'form',
      performedBy,
      performedByUserId,
      notes: reason,
    });

    logger.info(`Lead ${leadId} reassigned from ${previousBuyerName || 'none'} to ${newBuyer.name}`);
    return {
      leadId,
      previousBuyerId,
      previousBuyerName,
      newBuyerId: newBuyer._id,
      newBuyerName: newBuyer.name,
      reassignedAt: new Date(),
    };
  }
}

module.exports = ReassignmentService;
