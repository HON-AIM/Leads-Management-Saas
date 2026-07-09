const express = require('express');
const Lead = require('../models/Lead');
const Client = require('../models/Client');
const { authenticate, requirePermission, tenantIsolation } = require('../middleware/auth');
const { optionalTenant } = require('../middleware/tenant');
const { ingestLead } = require('../services/ingestionService');
const { pushToQueue } = require('../queue/ingestionQueue');
const {
  submitBid,
  getPingSession,
  executePost,
  buildAnonymizedPing,
  createPingSession,
} = require('../services/pingPostService');
const { resolveCampaign, loadCampaignBuyers, applyCampaignWeights } = require('../services/campaignResolver');
const { filterEligibleFromList } = require('../services/buyerEligibilityService');
const { assignLeadToBuyer } = require('../services/routingService');
const { pushToDeliveryQueue } = require('../queue/deliveryQueue');
const Campaign = require('../models/Campaign');

const router = express.Router();
const LOG_PREFIX = '[PingPostRoutes]';

function log(step, details = {}) {
  console.log(`${LOG_PREFIX} ${new Date().toISOString()} | ${step}`, details);
}

/**
 * POST /api/ping — Create anonymized ping for a lead (external or internal)
 * Body: { leadId } OR full lead ingest fields for ping-only flow
 */
router.post('/ping', optionalTenant, async (req, res) => {
  try {
    const tenantId = req.tenantId || req.tenant?._id || req.body.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant context required' });

    let lead;
    if (req.body.leadId) {
      lead = await Lead.findOne({ _id: req.body.leadId, tenantId });
      if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    } else {
      const result = await ingestLead(req.body, tenantId);
      if (!result.success) return res.status(result.statusCode).json({ success: false, error: result.error });
      lead = result.lead;
    }

    const campaign = await resolveCampaign(lead, tenantId);
    if (!campaign) {
      return res.status(400).json({ success: false, error: 'No active campaign found for lead' });
    }

    let candidates = await loadCampaignBuyers(campaign, tenantId);
    candidates = applyCampaignWeights(candidates, campaign);
    const leadState = (lead.normalized_region_code || lead.state || '').toUpperCase();
    const leadCountry = (lead.normalized_country_code || 'US').toUpperCase();
    const { eligible, reason } = await filterEligibleFromList(candidates, lead, campaign);

    if (!eligible.length) {
      return res.status(422).json({ success: false, error: reason || 'no_eligible_buyers' });
    }

    const timeoutMs = campaign.pingTimeoutMs || 3000;
    const session = await createPingSession(lead, tenantId, campaign, eligible, timeoutMs);

    res.status(201).json({
      success: true,
      pingId: session._id,
      status: session.status,
      expiresAt: session.expiresAt,
      invitedBuyers: eligible.length,
      autoBids: session.bids.length,
      ping: buildAnonymizedPing(lead, campaign),
      bidEndpoint: `/api/ping/${session._id}/bid`,
      postEndpoint: `/api/ping/${session._id}/post`,
    });
  } catch (err) {
    log('PING_ERROR', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/ping/:pingId — Ping session status */
router.get('/ping/:pingId', authenticate, tenantIsolation, requirePermission('leads', 'read'), async (req, res) => {
  try {
    const session = await getPingSession(req.params.pingId, req.tenantId);
    if (!session) return res.status(404).json({ success: false, error: 'Ping not found' });

    res.json({
      success: true,
      ping: {
        id: session._id,
        status: session.status,
        pingPayload: session.pingPayload,
        bids: session.bids.map((b) => ({
          buyerId: b.buyerId,
          buyerName: b.buyerName,
          amount: b.amount,
          status: b.status,
          source: b.source,
          respondedAt: b.respondedAt,
        })),
        winnerBuyerId: session.winnerBuyerId,
        winningBid: session.winningBid,
        expiresAt: session.expiresAt,
        resolvedAt: session.resolvedAt,
        postedAt: session.postedAt,
        lead: session.leadId,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/ping/:pingId/bid — Buyer submits bid */
router.post('/ping/:pingId/bid', optionalTenant, async (req, res) => {
  try {
    const tenantId = req.tenantId || req.tenant?._id || req.body.tenantId;
    const { buyerId, amount } = req.body;

    if (!tenantId || !buyerId || amount == null) {
      return res.status(400).json({ success: false, error: 'tenantId, buyerId, and amount required' });
    }

    const result = await submitBid(req.params.pingId, buyerId, Number(amount), tenantId);
    if (!result.success) return res.status(422).json(result);

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/ping/:pingId/post — Execute post to winning buyer (full lead delivery) */
router.post('/ping/:pingId/post', optionalTenant, async (req, res) => {
  try {
    const tenantId = req.tenantId || req.tenant?._id || req.body.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant context required' });

    const session = await getPingSession(req.params.pingId, tenantId);
    if (!session) return res.status(404).json({ success: false, error: 'Ping not found' });

    if (session.status === 'bidding' || session.status === 'pending') {
      const PingSession = require('../models/PingSession');
      const fresh = await PingSession.findById(session._id);
      const eligible = await Client.find({ _id: { $in: fresh.invitedBuyerIds } }).lean();
      const { resolveWinningBid } = require('../services/pingPostService');
      const winner = resolveWinningBid(fresh, eligible);
      if (!winner) {
        fresh.status = 'no_bids';
        fresh.resolvedAt = new Date();
        await fresh.save();
        return res.status(422).json({ success: false, error: 'no_bids' });
      }
      fresh.status = 'won';
      fresh.winnerBuyerId = winner.buyer._id;
      fresh.winningBid = winner.winningBid;
      fresh.resolvedAt = new Date();
      await fresh.save();
    }

    const postResult = await executePost(req.params.pingId, tenantId);
    if (!postResult.success) return res.status(422).json(postResult);

    const campaign = postResult.lead.campaignId
      ? await Campaign.findById(postResult.lead.campaignId).lean()
      : await resolveCampaign(postResult.lead, tenantId);

    const routeResult = await assignLeadToBuyer(
      postResult.lead,
      postResult.buyer,
      tenantId,
      'ping_post',
      campaign,
      { bidAmount: postResult.winningBid, pingSessionId: postResult.pingSessionId }
    );

    if (routeResult.assignedTo) {
      postResult.lead.assignedTo = routeResult.assignedTo;
      postResult.lead.status = 'assigned';
      postResult.lead.ingestionStatus = 'delivered';
      postResult.lead.routingMethod = 'ping_post';
      await postResult.lead.save();

      try {
        await pushToDeliveryQueue(postResult.lead);
      } catch (e) {
        log('DELIVERY_QUEUE_WARN', { error: e.message });
      }
    }

    res.json({
      success: true,
      pingId: req.params.pingId,
      leadId: postResult.lead._id,
      buyer: routeResult.assignedBuyer,
      winningBid: postResult.winningBid,
      financials: routeResult.financials,
    });
  } catch (err) {
    log('POST_ERROR', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/ping/:pingId/resolve — Resolve auction without posting (admin) */
router.post('/ping/:pingId/resolve', authenticate, tenantIsolation, requirePermission('leads', 'write'), async (req, res) => {
  try {
    const PingSession = require('../models/PingSession');
    const session = await PingSession.findOne({ _id: req.params.pingId, tenantId: req.tenantId });
    if (!session) return res.status(404).json({ success: false, error: 'Ping not found' });

    const eligible = await Client.find({ _id: { $in: session.invitedBuyerIds } }).lean();
    const { resolveWinningBid } = require('../services/pingPostService');
    const winner = resolveWinningBid(session, eligible);

    if (!winner) {
      session.status = 'no_bids';
      session.resolvedAt = new Date();
      await session.save();
      return res.json({ success: false, reason: 'no_bids' });
    }

    session.status = 'won';
    session.winnerBuyerId = winner.buyer._id;
    session.winningBid = winner.winningBid;
    session.resolvedAt = new Date();
    await session.save();

    res.json({
      success: true,
      winnerBuyerId: winner.buyer._id,
      winnerName: winner.buyer.name,
      winningBid: winner.winningBid,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
