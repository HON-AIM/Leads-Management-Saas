const router = require('express').Router({ mergeParams: true });
const { authenticate, authorize } = require('../middleware/auth');
const fieldDefinitionService = require('../services/fieldDefinitionService');
const { success, created, error, notFound, paginated } = require('../utils/response');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const fields = await fieldDefinitionService.listByCampaign(req.params.campaignId, req.tenantId);
    return success(res, fields);
  } catch (err) {
    return error(res, err.message);
  }
});

router.post('/', authorize('admin', 'member'), async (req, res) => {
  try {
    const { fieldName, description, type, isRequired, visibleInPortal, listOptions } = req.body;
    if (!fieldName || typeof fieldName !== 'string') return error(res, 'fieldName is required', 400);
    if (!/^[a-z][a-z0-9_]*$/.test(fieldName.trim())) {
      return error(res, 'fieldName must be lowercase, alphanumeric plus underscores, starting with a letter', 400);
    }
    const existing = await fieldDefinitionService.listByCampaign(req.params.campaignId, req.tenantId);
    if (existing.some((f) => f.fieldName === fieldName.trim())) {
      return error(res, `A field named "${fieldName}" already exists in this campaign`, 400);
    }
    const field = await fieldDefinitionService.create({
      campaignId: req.params.campaignId,
      fieldName: fieldName.trim(),
      description: description || '',
      type: type || 'String',
      isRequired: !!isRequired,
      visibleInPortal: visibleInPortal !== false,
      listOptions: listOptions || [],
    }, req.tenantId);
    return created(res, field);
  } catch (err) {
    return error(res, err.message, 400);
  }
});

router.put('/:fieldId', authorize('admin', 'member'), async (req, res) => {
  try {
    const field = await fieldDefinitionService.getById(req.params.fieldId);
    if (!field) return notFound(res, 'Field not found');
    if (field.campaignId.toString() !== req.params.campaignId) return error(res, 'Field does not belong to this campaign', 400);
    if (field.isStandard) {
      const { fieldName, isStandard, type } = req.body;
      if (fieldName || isStandard !== undefined || type) {
        return error(res, 'Cannot change name, type, or isStandard on standard fields', 400);
      }
    }
    const updated = await fieldDefinitionService.update(req.params.fieldId, req.body);
    return success(res, updated);
  } catch (err) {
    return error(res, err.message, 400);
  }
});

router.delete('/:fieldId', authorize('admin', 'member'), async (req, res) => {
  try {
    const field = await fieldDefinitionService.getById(req.params.fieldId);
    if (!field) return notFound(res, 'Field not found');
    if (field.campaignId.toString() !== req.params.campaignId) return error(res, 'Field does not belong to this campaign', 400);
    await fieldDefinitionService.delete(req.params.fieldId);
    return success(res, { message: 'Field deleted' });
  } catch (err) {
    return error(res, err.message, 400);
  }
});

router.post('/import', authorize('admin', 'member'), async (req, res) => {
  try {
    const { fromCampaignId } = req.body;
    if (!fromCampaignId) return error(res, 'fromCampaignId is required', 400);
    const fields = await fieldDefinitionService.importFromCampaign(req.params.campaignId, fromCampaignId, req.tenantId);
    return success(res, fields);
  } catch (err) {
    return error(res, err.message, 400);
  }
});

module.exports = router;
