const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const buyerService = require('../services/buyerService');
const { success, created, error, notFound, paginated } = require('../utils/response');
const { validate } = require('../middleware/validate');
const { createBuyer, updateBuyer } = require('../middleware/validation/schemas');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const result = await buyerService.list(req.tenantId, {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      status: req.query.status,
      search: req.query.search,
    });
    return paginated(res, { data: result.buyers, total: result.total, page: result.page, pages: result.pages });
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const buyer = await buyerService.getById(req.params.id, req.tenantId);
    if (!buyer) return notFound(res, 'Buyer not found');
    return success(res, buyer);
  } catch (err) {
    return error(res, err.message);
  }
});

router.post('/', authorize('admin', 'manager'), validate(createBuyer), async (req, res) => {
  try {
    const buyer = await buyerService.create({ ...req.body, createdBy: req.userId }, req.tenantId);
    return created(res, buyer);
  } catch (err) {
    return error(res, err.message, 400);
  }
});

router.put('/:id', authorize('admin', 'manager'), validate(updateBuyer), async (req, res) => {
  try {
    const buyer = await buyerService.update(req.params.id, req.tenantId, req.body);
    if (!buyer) return notFound(res, 'Buyer not found');
    return success(res, buyer);
  } catch (err) {
    return error(res, err.message, 400);
  }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const result = await buyerService.delete(req.params.id, req.tenantId);
    if (!result) return notFound(res, 'Buyer not found');
    return success(res, { message: 'Buyer deleted' });
  } catch (err) {
    return error(res, err.message);
  }
});

module.exports = router;
