const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const leadService = require('../services/leadService');
const buyerService = require('../services/buyerService');
const leadAssignmentRepo = require('../repositories/leadAssignmentRepository');
const leadAssignment = require('../models/LeadAssignment');
const Buyer = require('../models/Buyer');
const Lead = require('../models/Lead');
const Campaign = require('../models/Campaign');
const routingLogRepository = require('../repositories/routingLogRepository');
const { runPartialPipeline } = require('../pipeline');
const { attemptDelivery } = require('../services/deliveryAttemptService');
const config = require('../config');
const logger = require('../utils/logger');
const { success, created, error, notFound, paginated, badRequest } = require('../utils/response');
const { validate } = require('../middleware/validate');
const { createLead, updateLead } = require('../middleware/validation/schemas');

router.use(authenticate);

router.get('/duplicates', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const showReviewed = req.query.showReviewed === 'true';

    const query = {
      tenantId: req.tenantId,
      isDuplicate: true,
    };
    if (!showReviewed) {
      query.reviewedAt = { $exists: false };
    }

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .populate('duplicateOf', 'name email phone state status source createdAt')
        .populate('campaignId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Lead.countDocuments(query),
    ]);

    return paginated(res, { data: leads, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/', async (req, res) => {
  try {
    const { page, limit, status, state, source, campaignId, search, startDate, endDate, buyerId } = req.query;

    let leadIds = null;
    if (buyerId) {
      const assignments = await leadAssignment.find({ buyerId, tenantId: req.tenantId }).select('leadId').lean();
      leadIds = assignments.map((a) => a.leadId);
      if (leadIds.length === 0) {
        return paginated(res, { data: [], total: 0, page: parseInt(page) || 1, pages: 0 });
      }
    }

    const result = await leadService.list(req.tenantId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 25,
      status, state, source, campaignId, search, startDate, endDate, leadIds,
    });

    const assignments = await leadAssignmentRepo.findByLeadIds(result.leads.map((l) => l._id), req.tenantId);
    const assignmentMap = new Map();
    for (const a of assignments) {
      if (!assignmentMap.has(a.leadId.toString())) {
        assignmentMap.set(a.leadId.toString(), a);
      }
    }

    const enriched = result.leads.map((lead) => {
      const a = assignmentMap.get(lead._id.toString());
      return {
        ...lead,
        buyer: a?.buyerId || null,
        assignmentStatus: a?.status || null,
        routingMode: a?.routingMode || null,
      };
    });

    return paginated(res, { data: enriched, total: result.total, page: result.page, pages: result.pages });
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const lead = await leadService.getById(req.params.id, req.tenantId);
    if (!lead) return notFound(res, 'Lead not found');

    const [assignment, routingLogs] = await Promise.all([
      leadAssignmentRepo.findByLead(req.params.id, req.tenantId),
      routingLogRepository.findByLead(req.params.id),
    ]);

    return success(res, { ...lead.toObject(), assignment, routingLogs });
  } catch (err) {
    return error(res, err.message);
  }
});

router.post('/', authorize('admin', 'member'), validate(createLead), async (req, res) => {
  try {
    const lead = await leadService.create({ ...req.body, createdBy: req.userId }, req.tenantId);
    return created(res, lead);
  } catch (err) {
    return error(res, err.message, 400);
  }
});

router.put('/:id', authorize('admin', 'member'), validate(updateLead), async (req, res) => {
  try {
    const lead = await leadService.update(req.params.id, req.tenantId, req.body);
    if (!lead) return notFound(res, 'Lead not found');
    return success(res, lead);
  } catch (err) {
    return error(res, err.message, 400);
  }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const result = await leadService.delete(req.params.id, req.tenantId);
    if (!result) return notFound(res, 'Lead not found');
    return success(res, { message: 'Lead deleted' });
  } catch (err) {
    return error(res, err.message);
  }
});

async function canReassignOrAssign(lead, tenantId) {
  // Duplicate leads must never be assigned or reassigned
  if (lead.isDuplicate || lead.status === 'duplicate') {
    return { allowed: false, reason: 'Cannot assign a duplicate lead' };
  }

  if (['unassigned', 'new'].includes(lead.status)) return { allowed: true };

  if (lead.status === 'failed' || lead.status === 'assigned' || lead.status === 'delivered') {
    const existing = await leadAssignmentRepo.findByLead(lead._id, tenantId);
    if (!existing) return { allowed: true };
    const buyerStatus = existing.buyerId?.status;
    if (buyerStatus === 'paused' || buyerStatus === 'inactive' || buyerStatus === 'full') {
      return { allowed: true };
    }
  }

  return { allowed: false, reason: 'Lead is currently assigned to an active buyer' };
}

router.post('/:id/reassign', authorize('admin', 'member'), async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!lead) return notFound(res, 'Lead not found');

    const eligibility = await canReassignOrAssign(lead, req.tenantId);
    if (!eligibility.allowed) return badRequest(res, eligibility.reason || 'Lead cannot be reassigned in its current status');

    const campaign = await Campaign.findOne({ _id: lead.campaignId, tenantId: req.tenantId, status: 'active' });
    if (!campaign) return badRequest(res, 'Lead has no active campaign. Assign a campaign first or use manual assignment.');

    let supplier = null;
    if (lead.supplierId) {
      const Supplier = require('../models/Supplier');
      supplier = await Supplier.findOne({ _id: lead.supplierId, tenantId: req.tenantId });
    }

    const ctx = await runPartialPipeline(
      { lead, campaign, supplier, tenantId: req.tenantId },
      ['buyerFilter', 'capFilter', 'stateFilter', 'assign', 'deliver', 'log']
    );

    if (!ctx.assignment) {
      return badRequest(res, ctx.stopReason || 'No eligible buyer found for this lead');
    }

    const updated = await Lead.findOne({ _id: lead._id, tenantId: req.tenantId }).populate('campaignId', 'name');
    const assignment = await leadAssignmentRepo.findByLead(lead._id, req.tenantId);

    return success(res, { ...updated.toObject(), assignment });
  } catch (err) {
    logger.error('Reassign failed', { leadId: req.params.id, error: err.message });
    return error(res, err.message, 400);
  }
});

router.post('/:id/assign', authorize('admin', 'member'), async (req, res) => {
  try {
    const { buyerId } = req.body;
    if (!buyerId) return badRequest(res, 'buyerId is required');

    const lead = await Lead.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!lead) return notFound(res, 'Lead not found');

    const eligibility = await canReassignOrAssign(lead, req.tenantId);
    if (!eligibility.allowed) return badRequest(res, eligibility.reason || 'Lead cannot be reassigned in its current status');

    const buyer = await Buyer.findOne({ _id: buyerId, tenantId: req.tenantId });
    if (!buyer) return badRequest(res, 'Buyer not found');
    if (buyer.status !== 'active') return badRequest(res, `Buyer is ${buyer.status}. Only active buyers can receive leads.`);

    const campaign = lead.campaignId
      ? await Campaign.findOne({ _id: lead.campaignId, tenantId: req.tenantId })
      : null;

    const existing = await leadAssignmentRepo.findByLead(lead._id, req.tenantId);
    let assignment;
    if (existing) {
      existing.buyerId = buyerId;
      existing.status = 'pending';
      existing.deliveredAt = undefined;
      existing.failureReason = undefined;
      existing.responseData = undefined;
      existing.routingMode = 'manual';
      existing.cost = campaign?.costPerLead || existing.cost || 0;
      existing.revenue = buyer.pricePerLead || existing.revenue || 0;
      await existing.save();
      assignment = existing;
    } else {
      assignment = await leadAssignmentRepo.create({
        leadId: lead._id,
        buyerId: buyer._id,
        campaignId: campaign?._id,
        routingMode: 'manual',
        cost: campaign?.costPerLead || 0,
        revenue: buyer.pricePerLead || 0,
        status: 'pending',
        tenantId: req.tenantId,
      });
    }

    await buyerService.incrementCaps(buyer._id, req.tenantId);

    lead.status = 'assigned';
    await lead.save();

    const startTime = Date.now();
    let deliveryResult;
    if (!buyer.delivery || buyer.delivery.provider === 'none' || !buyer.delivery.url) {
      const { DeliveryAttempt } = require('../models/DeliveryAttempt');
      await DeliveryAttempt.create({
        leadAssignmentId: assignment._id,
        leadId: lead._id,
        buyerId: buyer._id,
        attemptNumber: 1,
        payloadSent: null,
        webhookUrl: '',
        statusCode: null,
        responseBody: null,
        responseHeaders: null,
        success: true,
        failureReason: 'No-op delivery: no webhook URL configured',
        durationMs: 0,
        triggeredBy: 'manual',
        triggeredByUserId: req.userId,
        tenantId: req.tenantId,
      });
      await leadAssignmentRepo.updateStatus(assignment._id, 'delivered', { deliveredAt: new Date() });
      await leadService.markDelivered(lead._id, req.tenantId);
      deliveryResult = { success: true, method: 'no-op' };
    } else {
      let supplier = null;
      if (lead.supplierId) {
        const Supplier = require('../models/Supplier');
        supplier = await Supplier.findOne({ _id: lead.supplierId, tenantId: req.tenantId });
      }
      const maxRetries = config.delivery.maxRetries;
      let attempt = 0;
      let lastResult;
      while (attempt < maxRetries) {
        attempt++;
        lastResult = await attemptDelivery({
          leadAssignment: assignment,
          lead,
          buyer,
          campaign,
          supplier,
          triggeredBy: 'manual',
          triggeredByUserId: req.userId,
          tenantId: req.tenantId,
        });
        if (lastResult.success) break;
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, attempt * config.delivery.initialDelayMs));
        }
      }
      deliveryResult = { success: lastResult.success, attempts: attempt };
    }

    await routingLogRepository.create({
      leadId: lead._id,
      campaignId: campaign?._id,
      tenantId: req.tenantId,
      routingMode: 'manual',
      eligibleBuyerIds: [buyer._id],
      selectedBuyerId: buyer._id,
      reason: `Manual assignment by admin`,
      durationMs: Date.now() - startTime,
    });

    const updated = await Lead.findOne({ _id: lead._id, tenantId: req.tenantId }).populate('campaignId', 'name');
    const updatedAssignment = await leadAssignmentRepo.findByLead(lead._id, req.tenantId);

    return success(res, { ...updated.toObject(), assignment: updatedAssignment });
  } catch (err) {
    logger.error('Manual assign failed', { leadId: req.params.id, error: err.message });
    return error(res, err.message, 400);
  }
});

router.post('/:id/duplicate-action', authorize('admin', 'member'), async (req, res) => {
  try {
    const { action } = req.body;
    if (!action || !['ignore', 'reassign', 'update_original', 'delete_permanently'].includes(action)) {
      return badRequest(res, 'action must be one of: ignore, reassign, update_original, delete_permanently');
    }

    const lead = await Lead.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!lead) return notFound(res, 'Lead not found');
    if (!lead.isDuplicate) return badRequest(res, 'Lead is not marked as a duplicate');

    if (action === 'ignore') {
      lead.reviewedAt = new Date();
      await lead.save();

      await routingLogRepository.create({
        leadId: lead._id,
        campaignId: lead.campaignId || null,
        tenantId: req.tenantId,
        routingMode: 'manual',
        eligibleBuyerIds: [],
        selectedBuyerId: null,
        reason: `Duplicate ignored by admin`,
        durationMs: 0,
      });

      return success(res, { message: 'Duplicate reviewed and dismissed', lead });
    }

    if (action === 'delete_permanently') {
      if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ success: false, error: 'Only admins can permanently delete leads' });
      }
      await Lead.findByIdAndDelete(lead._id);

      await routingLogRepository.create({
        leadId: lead._id,
        campaignId: lead.campaignId || null,
        tenantId: req.tenantId,
        routingMode: 'manual',
        eligibleBuyerIds: [],
        selectedBuyerId: null,
        reason: `Duplicate permanently deleted by admin`,
        durationMs: 0,
      });

      return success(res, { message: 'Duplicate permanently deleted' });
    }

    if (action === 'reassign') {
      const campaign = await Campaign.findOne({ _id: lead.campaignId, tenantId: req.tenantId, status: 'active' });
      if (!campaign) return badRequest(res, 'Lead has no active campaign');

      const excludeBuyerIds = [];
      if (lead.duplicateOf) {
        const originalAssignment = await leadAssignmentRepo.findByLead(lead.duplicateOf, req.tenantId);
        if (originalAssignment?.buyerId) {
          const id = originalAssignment.buyerId._id || originalAssignment.buyerId;
          excludeBuyerIds.push(id.toString());
        }
      }
      const selfAssignment = await leadAssignmentRepo.findByLead(lead._id, req.tenantId);
      if (selfAssignment?.buyerId) {
        const id = (selfAssignment.buyerId._id || selfAssignment.buyerId).toString();
        if (!excludeBuyerIds.includes(id)) excludeBuyerIds.push(id);
      }

      const eligibleBuyerCount = (campaign.assignedBuyers || []).length - excludeBuyerIds.length;
      if (eligibleBuyerCount <= 0) {
        return badRequest(res, 'No other eligible buyer available to reassign this duplicate to');
      }

      lead.isDuplicate = false;
      lead.status = 'new';
      lead.reviewedAt = new Date();
      await lead.save();

      let supplier = null;
      if (lead.supplierId) {
        const Supplier = require('../models/Supplier');
        supplier = await Supplier.findById(lead.supplierId);
      }

      const ctx = await runPartialPipeline(
        { lead, campaign, supplier, tenantId: req.tenantId, excludeBuyerIds },
        ['buyerFilter', 'capFilter', 'stateFilter', 'assign', 'deliver', 'log']
      );

      await routingLogRepository.create({
        leadId: lead._id,
        campaignId: campaign._id,
        tenantId: req.tenantId,
        routingMode: 'manual',
        eligibleBuyerIds: ctx.buyerPool?.map((e) => e.buyer._id) || [],
        selectedBuyerId: ctx.selectedBuyer?.buyer?._id || null,
        reason: `Manual duplicate reassignment by admin — exclude buyer(s): ${excludeBuyerIds.join(', ') || 'none'}`,
        durationMs: Date.now() - ctx.startTime,
      });

      if (!ctx.assignment) {
        return badRequest(res, ctx.stopReason || 'No other eligible buyer available to reassign this duplicate to');
      }

      const updated = await Lead.findOne({ _id: lead._id, tenantId: req.tenantId }).populate('campaignId', 'name');
      const assignment = await leadAssignmentRepo.findByLead(lead._id, req.tenantId);
      return success(res, { ...updated.toObject(), assignment });
    }

    if (action === 'update_original') {
      if (!lead.duplicateOf) return badRequest(res, 'No original lead found to update');

      const originalLead = await Lead.findOne({ _id: lead.duplicateOf, tenantId: req.tenantId });
      if (!originalLead) return notFound(res, 'Original lead not found');

      const source = lead.rawPayload || {};
      const updates = {};
      const mergeFields = ['name', 'email', 'phone', 'state'];
      for (const field of mergeFields) {
        const newVal = lead[field] || source[field];
        if (newVal && newVal !== originalLead[field]) {
          updates[field] = newVal;
        }
      }
      if (Object.keys(updates).length > 0) {
        await Lead.findOneAndUpdate({ _id: lead.duplicateOf, tenantId: req.tenantId }, { $set: updates });
      }

      lead.reviewedAt = new Date();
      lead.status = 'merged';
      await lead.save();

      const originalAssignment = await leadAssignmentRepo.findByLead(lead.duplicateOf, req.tenantId);
      if (originalAssignment && originalAssignment.buyerId) {
        const Buyer = require('../models/Buyer');
        const buyer = await Buyer.findOne({ _id: originalAssignment.buyerId._id || originalAssignment.buyerId, tenantId: req.tenantId });
        const campaign = await Campaign.findOne({ _id: lead.campaignId, tenantId: req.tenantId });

        if (buyer && campaign) {
          const newAssignment = await leadAssignmentRepo.create({
            leadId: lead._id,
            buyerId: buyer._id,
            tenantId: req.tenantId,
            campaignId: campaign._id,
            routingMode: 'update_original',
            cost: campaign.costPerLead || 0,
            revenue: buyer.pricePerLead || 0,
            status: 'pending',
          });

          const updatedOriginal = await Lead.findOne({ _id: lead.duplicateOf, tenantId: req.tenantId }).lean();

          try {
            await attemptDelivery({
              leadAssignment: newAssignment,
              lead: updatedOriginal,
              buyer,
              campaign,
              supplier: null,
              triggeredBy: 'manual',
              triggeredByUserId: req.userId,
              tenantId: req.tenantId,
            });
          } catch (err) {
            logger.error('Update original delivery failed', { leadId: lead._id, error: err.message });
          }
        }
      }

      await routingLogRepository.create({
        leadId: lead._id,
        campaignId: lead.campaignId || null,
        tenantId: req.tenantId,
        routingMode: 'manual',
        eligibleBuyerIds: [],
        selectedBuyerId: originalAssignment?.buyerId?._id || originalAssignment?.buyerId || null,
        reason: `Duplicate merged into original by admin`,
        durationMs: 0,
      });

      const updatedLead = await Lead.findOne({ _id: lead._id, tenantId: req.tenantId }).populate('duplicateOf', 'name email');
      return success(res, { message: 'Updated original and triggered re-delivery', lead: updatedLead });
    }
  } catch (err) {
    logger.error('Duplicate action failed', { leadId: req.params.id, error: err.message });
    return error(res, err.message, 400);
  }
});

module.exports = router;
