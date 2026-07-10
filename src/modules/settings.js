const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const settingService = require('../services/settingService');
const { success, error } = require('../utils/response');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const settings = await settingService.get(req.tenantId);
    return success(res, settings);
  } catch (err) {
    return error(res, err.message);
  }
});

router.put('/', authorize('admin'), async (req, res) => {
  try {
    const settings = await settingService.update(req.tenantId, req.body);
    return success(res, settings);
  } catch (err) {
    return error(res, err.message, 400);
  }
});

module.exports = router;
