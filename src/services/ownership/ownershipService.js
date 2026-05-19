const Lead = require('../../../models/Lead');
const OwnershipAudit = require('../../../models/OwnershipAudit');
const routingHistoryService = require('./routingHistoryService');
const { getLogger } = require('../../utils/logger');

const logger = getLogger('OwnershipService');

class OwnershipService {
  static async assignLeadOwner(leadId, buyer, { tenantId, routingMethod = 'round_robin', routingPriority = 0, campaignId, campaignName, sourcePlatform = 'form', destinationPlatform = null, routingVersion = '2.0', performedBy = 'system', performedByUserId = null, notes = '' }) {
    const lead = await Lead.findById(leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    if (lead.ownershipMetadata?.ownershipLocked) {
      throw new Error(`Lead ${leadId} ownership is locked — cannot assign`);
    }

    const previousOwnerId = lead.ownershipMetadata?.currentOwnerId;
    const previousOwnerName = lead.assignedBuyerName;
    const isReassignment = !!previousOwnerId && previousOwnerId.toString() !== buyer._id.toString();

    const update = {
      assignedBuyerId: buyer._id,
      assignedBuyerName: buyer.name,
      assignedBuyerEmail: buyer.email || '',
      assignedBuyerGhlUserId: buyer.ghlUserId || '',
      assignedTo: buyer._id,
      assignmentStatus: isReassignment ? 'reassigned' : 'assigned',
      assignedAt: new Date(),
      routingMethod,
      routingPriority,
      routingVersion,
      sourcePlatform,
      destinationPlatform,
      'ownershipMetadata.currentOwnerType': 'buyer',
      'ownershipMetadata.currentOwnerId': buyer._id,
      'ownershipMetadata.ownershipLocked': false,
    };

    if (!lead.ownershipMetadata?.originalOwnerId) {
      update['ownershipMetadata.originalOwnerId'] = buyer._id;
      update['ownershipMetadata.originalOwnerName'] = buyer.name;
    }

    if (isReassignment) {
      update.reassignedAt = new Date();
      update['ownershipMetadata.ownershipTransferredAt'] = new Date();
      update.$inc = { reassignmentCount: 1 };
    }

    await Lead.findByIdAndUpdate(leadId, update, { new: true });

    const eventType = isReassignment ? 'reassigned' : 'assigned';

    await routingHistoryService.recordRoutingEvent({
      leadId,
      eventType,
      fromOwnerId: previousOwnerId,
      fromOwnerName: previousOwnerName,
      toBuyerId: buyer._id,
      toBuyerName: buyer.name,
      toBuyerEmail: buyer.email || '',
      toBuyerGhlUserId: buyer.ghlUserId || '',
      routingMethod,
      routingReason: notes || 'assigned',
      campaignId,
      campaignName,
      sourcePlatform,
      performedBy,
      performedByUserId,
      tenantId,
      systemNotes: isReassignment ? `Reassigned from ${previousOwnerName} to ${buyer.name}` : `Assigned to ${buyer.name}`,
    });

    await OwnershipAudit.create({
      leadId,
      tenantId,
      eventType: isReassignment ? 'reassigned' : 'ownership_assigned',
      previousOwnerId,
      previousOwnerName,
      newOwnerId: buyer._id,
      newOwnerName: buyer.name,
      newOwnerEmail: buyer.email || '',
      routingMethod,
      campaignId,
      campaignName,
      sourcePlatform,
      performedBy,
      performedByUserId,
      notes,
    });

    logger.info(`Ownership ${eventType} for lead ${leadId} to buyer ${buyer.name}`, { leadId, buyerId: buyer._id, eventType });
    return { leadId, buyerId: buyer._id, eventType };
  }

  static async transferOwnership(leadId, newBuyer, { tenantId, reason = 'manual', routingMethod = 'manual_reassign', routingPriority = 0, destinationPlatform = null, routingVersion = null, performedBy = 'system', performedByUserId = null }) {
    const lead = await Lead.findById(leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    if (lead.ownershipMetadata?.ownershipLocked) {
      throw new Error(`Lead ${leadId} ownership is locked — cannot transfer`);
    }

    const previousOwnerId = lead.ownershipMetadata?.currentOwnerId;
    const previousOwnerName = lead.assignedBuyerName;

    const update = {
      assignedBuyerId: newBuyer._id,
      assignedBuyerName: newBuyer.name,
      assignedBuyerEmail: newBuyer.email || '',
      assignedBuyerGhlUserId: newBuyer.ghlUserId || '',
      assignedTo: newBuyer._id,
      assignmentStatus: 'reassigned',
      reassignedAt: new Date(),
      routingMethod,
      routingPriority,
      destinationPlatform,
      ...(routingVersion ? { routingVersion } : {}),
      'ownershipMetadata.currentOwnerType': 'buyer',
      'ownershipMetadata.currentOwnerId': newBuyer._id,
      'ownershipMetadata.ownershipTransferredAt': new Date(),
      $inc: { reassignmentCount: 1 },
    };

    await Lead.findByIdAndUpdate(leadId, update, { new: true });

    await routingHistoryService.recordRoutingEvent({
      leadId,
      eventType: 'ownership_transferred',
      fromOwnerId: previousOwnerId,
      fromOwnerName: previousOwnerName,
      toBuyerId: newBuyer._id,
      toBuyerName: newBuyer.name,
      toBuyerEmail: newBuyer.email || '',
      toBuyerGhlUserId: newBuyer.ghlUserId || '',
      routingMethod: 'manual_reassign',
      routingReason: reason,
      performedBy,
      performedByUserId,
      tenantId,
      systemNotes: `Ownership transferred from ${previousOwnerName || 'none'} to ${newBuyer.name}: ${reason}`,
    });

    await OwnershipAudit.create({
      leadId,
      tenantId,
      eventType: 'ownership_transferred',
      previousOwnerId,
      previousOwnerName,
      newOwnerId: newBuyer._id,
      newOwnerName: newBuyer.name,
      newOwnerEmail: newBuyer.email || '',
      routingMethod: 'manual_reassign',
      routingReason: reason,
      performedBy,
      performedByUserId,
      notes: reason,
    });

    logger.info(`Ownership transferred for lead ${leadId} to ${newBuyer.name}`, { leadId, from: previousOwnerName, to: newBuyer.name });
    return { leadId, previousOwnerId, newOwnerId: newBuyer._id };
  }

  static async lockOwnership(leadId, { tenantId, performedBy = 'system', performedByUserId = null }) {
    const lead = await Lead.findById(leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    await Lead.findByIdAndUpdate(leadId, {
      'ownershipMetadata.ownershipLocked': true,
    });

    await routingHistoryService.recordRoutingEvent({
      leadId,
      eventType: 'ownership_locked',
      toBuyerId: lead.assignedBuyerId,
      toBuyerName: lead.assignedBuyerName,
      performedBy,
      performedByUserId,
      tenantId,
      systemNotes: 'Ownership locked',
    });

    await OwnershipAudit.create({
      leadId,
      tenantId,
      eventType: 'ownership_locked',
      newOwnerId: lead.assignedBuyerId,
      newOwnerName: lead.assignedBuyerName,
      performedBy,
      performedByUserId,
    });

    logger.info(`Ownership locked for lead ${leadId}`);
    return { leadId, locked: true };
  }

  static async unlockOwnership(leadId, { tenantId, performedBy = 'system', performedByUserId = null }) {
    const lead = await Lead.findById(leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    await Lead.findByIdAndUpdate(leadId, {
      'ownershipMetadata.ownershipLocked': false,
    });

    await routingHistoryService.recordRoutingEvent({
      leadId,
      eventType: 'ownership_unlocked',
      toBuyerId: lead.assignedBuyerId,
      toBuyerName: lead.assignedBuyerName,
      performedBy,
      performedByUserId,
      tenantId,
      systemNotes: 'Ownership unlocked',
    });

    await OwnershipAudit.create({
      leadId,
      tenantId,
      eventType: 'ownership_unlocked',
      newOwnerId: lead.assignedBuyerId,
      newOwnerName: lead.assignedBuyerName,
      performedBy,
      performedByUserId,
    });

    logger.info(`Ownership unlocked for lead ${leadId}`);
    return { leadId, locked: false };
  }

  static async getOwnership(leadId) {
    const lead = await Lead.findById(leadId)
      .select('assignedBuyerId assignedBuyerName assignedBuyerEmail assignedBuyerGhlUserId assignmentStatus assignedAt reassignedAt reassignmentCount ownershipMetadata externalReferences routingMethod sourcePlatform');
    if (!lead) throw new Error(`Lead ${leadId} not found`);
    return lead;
  }
}

module.exports = OwnershipService;
