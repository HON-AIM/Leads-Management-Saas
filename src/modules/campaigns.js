const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const campaignService = require('../services/campaignService');
const { success, created, error, notFound, paginated } = require('../utils/response');
const { validate } = require('../middleware/validate');
const { createCampaign, updateCampaign } = require('../middleware/validation/schemas');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const result = await campaignService.list(req.tenantId, {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      status: req.query.status,
    });
    return paginated(res, { data: result.campaigns, total: result.total, page: result.page, pages: result.pages });
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const campaign = await campaignService.getById(req.params.id, req.tenantId);
    if (!campaign) return notFound(res, 'Campaign not found');
    return success(res, campaign);
  } catch (err) {
    return error(res, err.message);
  }
});

router.post('/', authorize('admin', 'manager'), validate(createCampaign), async (req, res) => {
  try {
    const campaign = await campaignService.create({ ...req.body, createdBy: req.userId }, req.tenantId);
    return created(res, campaign);
  } catch (err) {
    return error(res, err.message, 400);
  }
});

router.put('/:id', authorize('admin', 'manager'), validate(updateCampaign), async (req, res) => {
  try {
    const campaign = await campaignService.update(req.params.id, req.tenantId, req.body);
    if (!campaign) return notFound(res, 'Campaign not found');
    return success(res, campaign);
  } catch (err) {
    return error(res, err.message, 400);
  }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const result = await campaignService.delete(req.params.id, req.tenantId);
    if (!result) return notFound(res, 'Campaign not found');
    return success(res, { message: 'Campaign deleted' });
  } catch (err) {
    return error(res, err.message);
  }
});

router.post('/:id/buyers', authorize('admin', 'manager'), async (req, res) => {
  try {
    const campaign = await campaignService.addBuyer(req.params.id, req.tenantId, req.body.buyerId, {
      weight: req.body.weight,
      priority: req.body.priority,
    });
    return success(res, campaign);
  } catch (err) {
    return error(res, err.message, 400);
  }
});

router.delete('/:id/buyers/:buyerId', authorize('admin', 'manager'), async (req, res) => {
  try {
    const campaign = await campaignService.removeBuyer(req.params.id, req.tenantId, req.params.buyerId);
    return success(res, campaign);
  } catch (err) {
    return error(res, err.message);
  }
});

module.exports = router;
