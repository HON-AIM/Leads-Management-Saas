const router = require('express').Router();
const Tenant = require('../models/Tenant');
const Lead = require('../models/Lead');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const supplierService = require('../services/supplierService');
const fieldDefinitionService = require('../services/fieldDefinitionService');
const { addLeadJob, isQueueAvailable } = require('../queue');
const { processLead } = require('../queue/leadProcessor');
const { ingestLimiter } = require('../middleware/rateLimit');
const { success, error, badRequest } = require('../utils/response');
const logger = require('../utils/logger');

router.post('/', ingestLimiter, async (req, res) => {
  try {
    const { tenantSlug, campaignId } = req.query;
    const apiKey = req.headers['x-api-key'];
    const supplierKey = req.headers['x-supplier-key'] || req.body?.supplierKey;
    const body = req.body;

    if (!tenantSlug) return badRequest(res, 'tenantSlug query param required');

    const tenant = await Tenant.findOne({ slug: tenantSlug, status: 'active' });
    if (!tenant) return badRequest(res, 'Invalid tenant');

    if (!apiKey) return badRequest(res, 'x-api-key header required');

    const tenantId = tenant._id;
    const user = await User.findOne({ apiKey, tenantId, status: 'active' });
    if (!user) return badRequest(res, 'Invalid API key');

    let supplier = null;
    if (supplierKey) {
      supplier = await supplierService.getByKey(supplierKey, tenantId);
      if (!supplier) return badRequest(res, 'Invalid supplier key');
    }

    const campaign = campaignId
      ? await Campaign.findOne({ _id: campaignId, tenantId, status: 'active' })
      : await Campaign.findOne({ tenantId, status: 'active' });

    if (!campaign) return badRequest(res, 'No active campaign found');

    const fieldValidationSample = Array.isArray(body) ? body[0] || {} : body;
    const fieldValidation = await fieldDefinitionService.validateRequiredFields(campaign._id, tenantId, fieldValidationSample).catch(() => ({ valid: true, missing: [] }));
    if (!fieldValidation.valid) {
      return badRequest(res, `Missing required field(s): ${fieldValidation.missing.join(', ')}`);
    }

    const leads = Array.isArray(body) ? body : [body];
    const results = [];
    const useQueue = isQueueAvailable();

    for (const leadData of leads) {
      try {
        const { supplierKey: _, ...cleanLeadData } = leadData;

        if (!cleanLeadData.name) {
          if (cleanLeadData.full_name) {
            cleanLeadData.name = cleanLeadData.full_name;
          } else {
            const parts = [cleanLeadData.first_name, cleanLeadData.last_name].filter(Boolean);
            if (parts.length > 0) {
              cleanLeadData.name = parts.join(' ').trim();
            }
          }
        }

        if (!cleanLeadData.name) {
          results.push({ status: 'error', error: 'Lead requires a name: provide name, full_name, or first_name/last_name' });
          continue;
        }

        const lead = await Lead.create({
          name: cleanLeadData.name,
          email: cleanLeadData.email,
          phone: cleanLeadData.phone,
          state: cleanLeadData.state,
          campaignId: campaign._id,
          supplierId: supplier?._id || undefined,
          source: leadData.source || (supplier ? supplier.name : 'webhook'),
          rawPayload: leadData,
          tenantId,
          status: 'new',
        });

        if (supplier) {
          await supplierService.incrementLeadsReceived(supplier._id, tenantId);
        }

        if (useQueue) {
          await addLeadJob({
            leadId: lead._id.toString(),
            campaignId: campaign._id.toString(),
            tenantId: tenantId.toString(),
          });
          results.push({ id: lead._id, status: 'queued' });
        } else {
          processLead({
            leadId: lead._id.toString(),
            campaignId: campaign._id.toString(),
            tenantId: tenantId.toString(),
          }).catch((err) => {
            logger.error('Inline lead processing error', { leadId: lead._id, error: err.message });
          });
          results.push({ id: lead._id, status: 'processing' });
        }
      } catch (err) {
        logger.error('Lead ingestion error', { error: err.message, leadData });
        results.push({ status: 'error', error: err.message });
      }
    }

    return success(res, { processed: results.length, results });
  } catch (err) {
    logger.error('Ingestion error', { error: err.message });
    return error(res, err.message, 500);
  }
});

module.exports = router;
