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

    const ctx = await runPartialPipeline(
      { lead, campaign, tenantId: req.tenantId },
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
      const maxRetries = config.delivery.maxRetries;
      let attempt = 0;
      let lastResult;
      while (attempt < maxRetries) {
        attempt++;
        lastResult = await attemptDelivery({
          leadAssignment: assignment,
          lead,
          buyer,
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

module.exports = router;
