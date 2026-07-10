const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const dashboardService = require('../services/dashboardService');
const { success, error } = require('../utils/response');

router.use(authenticate);

router.get('/overview', async (req, res) => {
  try {
    const data = await dashboardService.getOverview(req.tenantId);
    return success(res, data);
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/campaign-stats', async (req, res) => {
  try {
    const data = await dashboardService.getCampaignStats(req.tenantId);
    return success(res, data);
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/buyer-stats', async (req, res) => {
  try {
    const data = await dashboardService.getBuyerStats(req.tenantId);
    return success(res, data);
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/lead-trend', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await dashboardService.getLeadTrend(req.tenantId, days);
    return success(res, data);
  } catch (err) {
    return error(res, err.message);
  }
});

module.exports = router;
