const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const buyerService = require('../services/buyerService');
const payloadTemplateService = require('../services/payloadTemplateService');
const deliveryService = require('../services/deliveryService');
const Lead = require('../models/Lead');
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

router.post('/', authorize('admin', 'member'), validate(createBuyer), async (req, res) => {
  try {
    const buyer = await buyerService.create({ ...req.body, createdBy: req.userId }, req.tenantId);
    return created(res, buyer);
  } catch (err) {
    return error(res, err.message, 400);
  }
});

router.put('/:id', authorize('admin', 'member'), validate(updateBuyer), async (req, res) => {
  try {
    const buyer = await buyerService.update(req.params.id, req.tenantId, req.body);
    if (!buyer) return notFound(res, 'Buyer not found');
    return success(res, buyer);
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
    const buyer = await buyerService.update(req.params.id, req.tenantId, { status });
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

router.get('/:id/payload-template', async (req, res) => {
  try {
    const buyer = await buyerService.getById(req.params.id, req.tenantId);
    if (!buyer) return notFound(res, 'Buyer not found');
    const sampleLead = payloadTemplateService.getSampleLead(buyer._id, buyer.name);
    const availableTokens = payloadTemplateService.getAvailableTokens(sampleLead, buyer);
    return success(res, {
      template: buyer.delivery?.payloadTemplate || payloadTemplateService.DEFAULT_PAYLOAD_TEMPLATE,
      isDefault: !buyer.delivery?.payloadTemplate,
      availableTokens,
    });
  } catch (err) {
    return error(res, err.message);
  }
});

router.put('/:id/payload-template', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { template } = req.body;
    if (!template || typeof template !== 'string') {
      return error(res, 'Template string is required', 400);
    }
    const syntaxCheck = payloadTemplateService.validateTemplateSyntax(template);
    if (!syntaxCheck.valid) {
      return error(res, syntaxCheck.error, 400);
    }
    const buyer = await buyerService.update(req.params.id, req.tenantId, {
      'delivery.payloadTemplate': template,
    });
    if (!buyer) return notFound(res, 'Buyer not found');
    return success(res, buyer);
  } catch (err) {
    return error(res, err.message, 400);
  }
});

router.post('/:id/payload-template/preview', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { template, sampleLeadId } = req.body;
    if (!template || typeof template !== 'string') {
      return error(res, 'Template string is required', 400);
    }
    const buyer = await buyerService.getById(req.params.id, req.tenantId);
    if (!buyer) return notFound(res, 'Buyer not found');

    let lead = null;
    if (sampleLeadId) {
      lead = await Lead.findOne({ _id: sampleLeadId, tenantId: req.tenantId }).lean();
    }
    if (!lead) {
      lead = payloadTemplateService.getSampleLead(buyer._id, buyer.name);
    }

    const resolved = payloadTemplateService.resolveTemplate(template, lead, buyer);
    const jsonCheck = payloadTemplateService.validateResolvedJson(resolved);
    return success(res, {
      resolved,
      isValid: jsonCheck.valid,
      error: jsonCheck.error,
      parsed: jsonCheck.parsed,
    });
  } catch (err) {
    return error(res, err.message);
  }
});

router.post('/:id/payload-template/test-send', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { template, sampleLeadId } = req.body;
    if (!template || typeof template !== 'string') {
      return error(res, 'Template string is required', 400);
    }
    const buyer = await buyerService.getById(req.params.id, req.tenantId);
    if (!buyer) return notFound(res, 'Buyer not found');
    if (!buyer.delivery?.url) {
      return error(res, 'Buyer has no delivery URL configured', 400);
    }

    let lead = null;
    if (sampleLeadId) {
      lead = await Lead.findOne({ _id: sampleLeadId, tenantId: req.tenantId }).lean();
    }
    if (!lead) {
      lead = payloadTemplateService.getSampleLead(buyer._id, buyer.name);
    }

    const resolved = payloadTemplateService.resolveTemplate(template, lead, buyer);
    const jsonCheck = payloadTemplateService.validateResolvedJson(resolved);
    if (!jsonCheck.valid) {
      return error(res, `Cannot send: ${jsonCheck.error}`, 400);
    }

    const start = Date.now();
    try {
      const response = await deliveryService.post(buyer.delivery.url, jsonCheck.parsed, {
        secret: buyer.delivery.secret,
        timeout: 15000,
      });
      return success(res, {
        payloadSent: jsonCheck.parsed,
        statusCode: response.statusCode,
        responseBody: response.body,
        success: response.statusCode >= 200 && response.statusCode < 300,
        durationMs: Date.now() - start,
      });
    } catch (err) {
      return success(res, {
        payloadSent: jsonCheck.parsed,
        statusCode: 0,
        responseBody: err.message,
        success: false,
        durationMs: Date.now() - start,
      });
    }
  } catch (err) {
    return error(res, err.message);
  }
});

module.exports = router;
