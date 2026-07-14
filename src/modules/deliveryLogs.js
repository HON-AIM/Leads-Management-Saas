const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const leadAssignmentRepo = require('../repositories/leadAssignmentRepository');
const routingLogRepo = require('../repositories/routingLogRepository');
const Lead = require('../models/Lead');
const Buyer = require('../models/Buyer');
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
    const stats = await leadAssignmentRepo.getStats(req.tenantId);
    return success(res, stats);
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

router.post('/retry/:id', async (req, res) => {
  try {
    const assignment = await leadAssignmentRepo.findByLeadWithPopulate
      ? await leadAssignmentRepo.findByLeadWithPopulate(req.params.id, req.tenantId)
      : await require('../models/LeadAssignment').findOne({ _id: req.params.id, tenantId: req.tenantId })
          .populate('leadId', 'name email phone state source tenantId')
          .populate('buyerId', 'name email delivery tenantId');

    if (!assignment) return notFound(res, 'Assignment not found');
    if (assignment.status === 'delivered') return error(res, 'Already delivered');

    const lead = assignment.leadId;
    const buyerDoc = assignment.buyerId;
    if (!lead || !buyerDoc) return error(res, 'Lead or buyer not found');

    const buyer = typeof buyerDoc.toObject === 'function' ? buyerDoc.toObject() : buyerDoc;
    buyer.delivery = buyer.delivery || {};

    if (!buyer.delivery.url || buyer.delivery.provider === 'none') {
      await leadAssignmentRepo.updateStatus(assignment._id, 'delivered', { deliveredAt: new Date() });
      const LeadService = require('../services/leadService');
      await LeadService.markDelivered(lead._id, lead.tenantId);
      return success(res, { success: true, method: 'no-op', assignmentId: assignment._id });
    }

    const https = require('https');
    const http = require('http');
    const config = require('../config');

    const payload = {
      lead: { id: lead._id, name: lead.name, email: lead.email, phone: lead.phone, state: lead.state, source: lead.source },
      buyer: { id: buyer._id, name: buyer.name },
      timestamp: new Date().toISOString(),
    };

    const timeout = config.delivery?.timeoutMs || 10000;
    const parsed = new URL(buyer.delivery.url);
    const transport = parsed.protocol === 'https:' ? https : http;
    const data = JSON.stringify(payload);
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) };
    if (buyer.delivery.secret) headers['X-Webhook-Secret'] = buyer.delivery.secret;

    const response = await new Promise((resolve, reject) => {
      const req = transport.request({
        hostname: parsed.hostname, port: parsed.port, path: parsed.pathname,
        method: 'POST', headers, timeout,
      }, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode, body }));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      req.write(data);
      req.end();
    });

    if (response.statusCode >= 200 && response.statusCode < 300) {
      await leadAssignmentRepo.updateStatus(assignment._id, 'delivered', { deliveredAt: new Date(), responseData: { statusCode: response.statusCode, body: response.body } });
      const LeadService = require('../services/leadService');
      await LeadService.markDelivered(lead._id, lead.tenantId);
      return success(res, { success: true, statusCode: response.statusCode, assignmentId: assignment._id });
    } else {
      await leadAssignmentRepo.updateStatus(assignment._id, 'failed', { failureReason: `HTTP ${response.statusCode}`, responseData: { statusCode: response.statusCode, body: response.body } });
      const LeadService = require('../services/leadService');
      await LeadService.markFailed(lead._id, lead.tenantId);
      return success(res, { success: false, statusCode: response.statusCode, assignmentId: assignment._id });
    }
  } catch (err) {
    logger.error('Retry delivery failed', { error: err.message, assignmentId: req.params.id });
    return error(res, err.message);
  }
});

module.exports = router;
