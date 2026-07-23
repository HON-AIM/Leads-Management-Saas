const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const leadAssignmentRepo = require('../repositories/leadAssignmentRepository');
const routingLogRepo = require('../repositories/routingLogRepository');
const DeliveryAttempt = require('../models/DeliveryAttempt');
const Lead = require('../models/Lead');
const { attemptDelivery } = require('../services/deliveryAttemptService');
const { success, error, paginated, notFound } = require('../utils/response');
const logger = require('../utils/logger');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const result = await leadAssignmentRepo.findInTenant(req.tenantId, {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      status: req.query.status,
      buyerId: req.query.buyerId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    return paginated(res, { data: result.assignments, total: result.total, page: result.page, pages: result.pages });
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/stats', async (req, res) => {
  try {
    const raw = await leadAssignmentRepo.getStats(req.tenantId);
    const byStatus = raw.map(s => ({
      _id: s._id,
      count: s.count || 0,
      avgDuration: s.avgDuration || 0,
      maxDuration: s.maxDuration || 0,
      minDuration: s.minDuration || 0,
    }));
    const total = raw.reduce((a, s) => a + (s.count || 0), 0);
    const statusMap = {};
    for (const s of raw) statusMap[s._id] = s.count || 0;
    return success(res, {
      total,
      success: statusMap.delivered || 0,
      failed: statusMap.failed || 0,
      retrying: statusMap.retrying || 0,
      byStatus,
    });
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/buyer-stats', async (req, res) => {
  try {
    const stats = await leadAssignmentRepo.getBuyerStats(req.tenantId);
    return success(res, stats);
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/routing-logs', async (req, res) => {
  try {
    const result = await routingLogRepo.findInTenant(req.tenantId, {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
    });
    return paginated(res, { data: result.logs, total: result.total, page: result.page, pages: result.pages });
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/trends', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 14;
    const trends = await leadAssignmentRepo.getTrends(req.tenantId, days);
    return success(res, trends);
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/lead/:leadId/attempts', async (req, res) => {
  try {
    const attempts = await DeliveryAttempt.find({ leadId: req.params.leadId, tenantId: req.tenantId })
      .sort({ attemptNumber: 1 })
      .populate('buyerId', 'name email')
      .populate('triggeredByUserId', 'name email')
      .lean();
    return success(res, attempts);
  } catch (err) {
    return error(res, err.message);
  }
});

router.post('/retry/:id', async (req, res) => {
  try {
    const assignment = await require('../models/LeadAssignment').findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('leadId', 'name email phone state source tenantId')
      .populate('buyerId', 'name email delivery tenantId');

    if (!assignment) return notFound(res, 'Assignment not found');
    if (assignment.status === 'delivered') return error(res, 'Already delivered');

    const lead = assignment.leadId;
    const buyerDoc = assignment.buyerId;
    if (!lead || !buyerDoc) return error(res, 'Lead or buyer not found');

    // Block retry for duplicate leads
    if (lead.isDuplicate || lead.status === 'duplicate') {
      return error(res, 'Cannot retry delivery for a duplicate lead', 400);
    }

    const buyer = typeof buyerDoc.toObject === 'function' ? buyerDoc.toObject() : buyerDoc;
    buyer.delivery = buyer.delivery || {};

    if (!buyer.delivery.url || buyer.delivery.provider === 'none') {
      await DeliveryAttempt.create({
        leadAssignmentId: assignment._id,
        leadId: lead._id,
        buyerId: buyer._id,
        attemptNumber: (await DeliveryAttempt.countDocuments({ leadAssignmentId: assignment._id })) + 1,
        payloadSent: null,
        webhookUrl: '',
        statusCode: null,
        responseBody: null,
        responseHeaders: null,
        success: true,
        failureReason: 'No-op retry: no webhook URL configured',
        durationMs: 0,
        triggeredBy: 'manual_retry',
        triggeredByUserId: req.userId,
        tenantId: req.tenantId,
      });
      await leadAssignmentRepo.updateStatus(assignment._id, 'delivered', { deliveredAt: new Date() });
      await Lead.findByIdAndUpdate(lead._id, { status: 'delivered' });
      return success(res, { success: true, method: 'no-op', assignmentId: assignment._id });
    }

    const result = await attemptDelivery({
      leadAssignment: assignment,
      lead,
      buyer,
      triggeredBy: 'manual_retry',
      triggeredByUserId: req.userId,
      tenantId: req.tenantId,
    });

    await Lead.findByIdAndUpdate(lead._id, { status: result.success ? 'delivered' : 'failed' });

    return success(res, {
      success: result.success,
      statusCode: result.statusCode,
      failureReason: result.failureReason,
      durationMs: result.durationMs,
      assignmentId: assignment._id,
    });
  } catch (err) {
    logger.error('Retry delivery failed', { error: err.message, assignmentId: req.params.id });
    return error(res, err.message);
  }
});

module.exports = router;
