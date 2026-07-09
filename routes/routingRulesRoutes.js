const express = require('express');
const Lead = require('../models/Lead');
const Client = require('../models/Client');
const { authenticate, requirePermission, tenantIsolation } = require('../middleware/auth');
const { resolveCampaign, loadCampaignBuyers } = require('../services/campaignResolver');
const { filterEligibleFromList } = require('../services/buyerEligibilityService');
const { auditBuyerRules } = require('../services/buyerRuleEngine');

const router = express.Router();

/**
 * POST /api/routing/evaluate — Dry-run which buyers match a lead (rule debugger)
 * Body: { leadId } OR { lead: { state, zip, email, phone, source, metadata } }
 */
router.post('/routing/evaluate', authenticate, tenantIsolation, requirePermission('leads', 'read'), async (req, res) => {
  try {
    let lead;
    if (req.body.leadId) {
      lead = await Lead.findOne({ _id: req.body.leadId, tenantId: req.tenantId }).lean();
      if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    } else if (req.body.lead) {
      lead = { ...req.body.lead, tenantId: req.tenantId };
    } else {
      return res.status(400).json({ success: false, error: 'leadId or lead object required' });
    }

    const campaign = await resolveCampaign(lead, req.tenantId);
    const buyers = await loadCampaignBuyers(campaign, req.tenantId);

    const { eligible, reason, audit } = await filterEligibleFromList(buyers, lead, campaign);

    const detailedAudit = buyers.map((b) => auditBuyerRules(b, lead));

    res.json({
      success: true,
      lead: {
        state: lead.normalized_region_code || lead.state,
        zip: lead.postal_code,
        source: lead.source,
        campaign: campaign?.name || null,
      },
      campaign: campaign ? { id: campaign._id, name: campaign.name, routingMode: campaign.routingMode } : null,
      eligibleCount: eligible.length,
      eligibleBuyers: eligible.map((b) => ({ id: b._id, name: b.name, priority: b.priority })),
      reason,
      audit,
      detailedAudit,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/routing/buyers/:id/rules — Update buyer routing rules
 */
router.put('/routing/buyers/:id/rules', authenticate, tenantIsolation, requirePermission('clients', 'update'), async (req, res) => {
  try {
    const { routingRules, allowedStates, allowedCountries, priority, isFallbackBuyer } = req.body;

    const update = {};
    if (routingRules) update.routingRules = routingRules;
    if (allowedStates) update.allowedStates = allowedStates;
    if (allowedCountries) update.allowedCountries = allowedCountries;
    if (priority != null) update.priority = priority;
    if (isFallbackBuyer != null) update.isFallbackBuyer = isFallbackBuyer;

    const buyer = await Client.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      update,
      { new: true }
    ).lean();

    if (!buyer) return res.status(404).json({ success: false, error: 'Buyer not found' });
    res.json({ success: true, buyer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
