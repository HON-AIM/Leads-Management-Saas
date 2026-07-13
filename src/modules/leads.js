const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const leadService = require('../services/leadService');
const leadAssignmentRepo = require('../repositories/leadAssignmentRepository');
const leadAssignment = require('../models/LeadAssignment');
const routingLogRepository = require('../repositories/routingLogRepository');
const { success, created, error, notFound, paginated } = require('../utils/response');
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
    const assignmentMap = new Map(assignments.map((a) => [a.leadId.toString(), a]));

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

module.exports = router;
