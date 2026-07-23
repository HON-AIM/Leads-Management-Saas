const router = require('express').Router();
const Tenant = require('../models/Tenant');
const Lead = require('../models/Lead');
const Campaign = require('../models/Campaign');
const Setting = require('../models/Setting');
const { normalizeEmailForDedup, normalizePhoneForDedup } = require('../utils/deduplication');
const { normalizePhone } = require('../utils/phone');
const { addLeadJob, isQueueAvailable } = require('../queue');
const { processLead } = require('../queue/leadProcessor');
const logger = require('../utils/logger');

router.post('/:tenantSlug/:campaignId', async (req, res) => {
  try {
    const { tenantSlug, campaignId } = req.params;

    const tenant = await Tenant.findOne({ slug: tenantSlug, status: 'active' });
    if (!tenant) return res.status(400).json({ success: false, error: 'Invalid tenant' });

    const tenantId = tenant._id;

    const campaign = await Campaign.findOne({ _id: campaignId, tenantId, status: 'active' });
    if (!campaign) return res.status(400).json({ success: false, error: 'Campaign not found or inactive' });

    const body = req.body;
    const leads = Array.isArray(body) ? body : [body];
    const results = [];
    const useQueue = isQueueAvailable();

    const settings = await Setting.findOne({ tenantId }).lean().catch(() => null);
    const dedupWindowHours = settings?.dedupWindowHours || 720;
    const dedupSince = new Date(Date.now() - dedupWindowHours * 3600 * 1000);

    for (const raw of leads) {
      try {
        const leadData = extractGhlFields(raw);

        if (!leadData.name) {
          results.push({ status: 'error', error: 'No name found in payload' });
          continue;
        }

        const emailNorm = leadData.email ? normalizeEmailForDedup(leadData.email) : null;
        const phoneNorm = leadData.phone ? normalizePhoneForDedup(normalizePhone(leadData.phone) || leadData.phone) : null;

        let isDuplicate = false;
        let duplicateOf = null;

        if (emailNorm || phoneNorm) {
          const dupQuery = { tenantId, createdAt: { $gte: dedupSince }, isDuplicate: false };
          const conds = [];
          if (emailNorm) conds.push({ emailNormalized: emailNorm });
          if (phoneNorm) conds.push({ phoneNormalized: phoneNorm });
          if (conds.length) {
            dupQuery.$or = conds;
            const existingLead = await Lead.findOne(dupQuery).sort({ createdAt: -1 }).select('_id');
            if (existingLead) {
              isDuplicate = true;
              duplicateOf = existingLead._id;
            }
          }
        }

        const lead = await Lead.create({
          name: leadData.name,
          email: leadData.email,
          phone: leadData.phone,
          state: leadData.state,
          campaignId: campaign._id,
          source: leadData.source || 'ghl',
          rawPayload: raw,
          tenantId,
          status: isDuplicate ? 'duplicate' : 'new',
          isDuplicate,
          duplicateOf,
        });

        if (isDuplicate) {
          logger.info('Duplicate lead detected via webhook', { leadId: lead._id, duplicateOf });
          results.push({
            id: lead._id,
            status: 'duplicate',
            duplicate: true,
            duplicateOf: duplicateOf?.toString(),
            message: 'Duplicate lead detected. Lead stored but not processed.',
          });
          continue;
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
            logger.error('Webhook lead processing error', { leadId: lead._id, error: err.message });
          });
          results.push({ id: lead._id, status: 'processing' });
        }
      } catch (err) {
        logger.error('Webhook lead error', { error: err.message });
        results.push({ status: 'error', error: err.message });
      }
    }

    return res.json({ success: true, data: { processed: results.length, results } });
  } catch (err) {
    logger.error('Webhook error', { error: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
});

function extractGhlFields(raw) {
  const get = (keys) => {
    for (const k of keys) {
      if (raw[k] != null && String(raw[k]).trim()) return String(raw[k]).trim();
    }
    return null;
  };

  const name = get(['name', 'full_name', 'fullName', 'contact.name', 'contactName'])
    || [get(['first_name', 'firstName']), get(['last_name', 'lastName'])].filter(Boolean).join(' ') || null;

  const email = get(['email', 'contact.email', 'contactEmail']);
  const phone = get(['phone', 'contact.phone', 'contactPhone', 'phone1', 'phone2']);
  const state = get(['state', 'contact.state', 'contactState', 'address_state', 'addressState']);
  const source = get(['source', 'contact.source', 'leadSource', 'medium', 'attributedSource']);

  return { name, email, phone, state, source };
}

module.exports = router;
