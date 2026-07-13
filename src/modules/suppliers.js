const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const supplierService = require('../services/supplierService');
const { success, created, error, notFound, paginated } = require('../utils/response');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const result = await supplierService.list(req.tenantId, {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      status: req.query.status,
      search: req.query.search,
    });
    return paginated(res, { data: result.suppliers, total: result.total, page: result.page, pages: result.pages });
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const supplier = await supplierService.getById(req.params.id, req.tenantId);
    if (!supplier) return notFound(res, 'Supplier not found');
    return success(res, supplier);
  } catch (err) {
    return error(res, err.message);
  }
});

router.post('/', authorize('admin', 'member'), async (req, res) => {
  try {
    const { name, description, type, status, allowedCampaignIds } = req.body;
    if (!name) return error(res, 'Name is required', 400);
    const supplier = await supplierService.create({
      name, description, type, status, allowedCampaignIds, createdBy: req.userId,
    }, req.tenantId);
    return created(res, supplier);
  } catch (err) {
    return error(res, err.message, 400);
  }
});

router.put('/:id', authorize('admin', 'member'), async (req, res) => {
  try {
    const supplier = await supplierService.update(req.params.id, req.tenantId, req.body);
    if (!supplier) return notFound(res, 'Supplier not found');
    return success(res, supplier);
  } catch (err) {
    return error(res, err.message, 400);
  }
});

router.patch('/:id/status', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['active', 'paused', 'inactive'];
    if (!allowed.includes(status)) {
      return error(res, `Invalid status. Must be one of: ${allowed.join(', ')}`, 400);
    }
    const supplier = await supplierService.update(req.params.id, req.tenantId, { status });
    if (!supplier) return notFound(res, 'Supplier not found');
    return success(res, supplier);
  } catch (err) {
    return error(res, err.message, 400);
  }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const result = await supplierService.delete(req.params.id, req.tenantId);
    if (!result) return notFound(res, 'Supplier not found');
    return success(res, { message: 'Supplier deleted' });
  } catch (err) {
    return error(res, err.message);
  }
});

module.exports = router;
