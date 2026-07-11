const router = require('express').Router();
const Tenant = require('../models/Tenant');
const leadService = require('../services/leadService');
const { runPipeline } = require('../pipeline');
const { ingestLimiter } = require('../middleware/rateLimit');
const { success, error, badRequest } = require('../utils/response');
const logger = require('../utils/logger');

const User = require('../models/User');
const Campaign = require('../models/Campaign');
const { authenticate } = require('../middleware/auth');

router.post('/', ingestLimiter, authenticate, async (req, res) => {
  try {
    const { tenantSlug, campaignId } = req.query;
    const apiKey = req.headers['x-api-key'];
    const body = req.body;

    if (!tenantSlug) return badRequest(res, 'tenantSlug query param required');

    const tenant = await Tenant.findOne({ slug: tenantSlug, status: 'active' });
    if (!tenant) return badRequest(res, 'Invalid tenant');

    if (!apiKey) return badRequest(res, 'x-api-key header required');

    const tenantId = tenant._id;
    const user = await User.findOne({ apiKey, tenantId, status: 'active' });
    if (!user) return badRequest(res, 'Invalid API key');

    const campaign = campaignId
      ? await Campaign.findOne({ _id: campaignId, tenantId, status: 'active' })
      : await Campaign.findOne({ tenantId, status: 'active' });

    if (!campaign) return badRequest(res, 'No active campaign found');

    const leads = Array.isArray(body) ? body : [body];
    const results = [];

    for (const leadData of leads) {
      try {
        const lead = await leadService.create({
          ...leadData,
          campaignId: campaign._id,
          source: leadData.source || 'webhook',
          rawPayload: leadData,
        }, tenantId);

        const ctx = await runPipeline({ lead, campaign, tenantId });

        if (ctx.assignment) {
          results.push({
            id: lead._id,
            status: ctx.deliveryResult?.success ? 'delivered' : 'delivery-failed',
            buyer: ctx.selectedBuyer?.buyer?.name,
          });
        } else if (lead.isDuplicate) {
          results.push({ id: lead._id, status: 'duplicate' });
        } else {
          results.push({ id: lead._id, status: 'unassigned', reason: ctx.stopReason });
        }
      } catch (err) {
        logger.error('Lead processing error', { error: err.message, leadData });
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
