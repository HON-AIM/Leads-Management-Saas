const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const leadAssignmentRepo = require('../repositories/leadAssignmentRepository');
const routingLogRepo = require('../repositories/routingLogRepository');
const { success, error, paginated } = require('../utils/response');

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

module.exports = router;
