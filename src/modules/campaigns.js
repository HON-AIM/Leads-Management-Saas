const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const campaignService = require('../services/campaignService');
const campaignRepo = require('../repositories/campaignRepository');
const Campaign = require('../models/Campaign');
const Buyer = require('../models/Buyer');
const { success, created, error, notFound, paginated } = require('../utils/response');
const { validate } = require('../middleware/validate');
const { createCampaign, updateCampaign } = require('../middleware/validation/schemas');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const result = await campaignService.list(req.tenantId, {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      status: req.query.status,
    });
    return paginated(res, { data: result.campaigns, total: result.total, page: result.page, pages: result.pages });
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const campaign = await campaignService.getById(req.params.id, req.tenantId);
    if (!campaign) return notFound(res, 'Campaign not found');
    return success(res, campaign);
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/:id/next-buyer', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('assignedBuyers.buyerId');
    if (!campaign) return notFound(res, 'Campaign not found');

    if (campaign.routingMode !== 'round_robin') {
      return success(res, { nextBuyerId: null, reason: 'not_round_robin' });
    }

    // Reuse the same eligibility logic as the real routing pipeline (buyerFilter + capFilter stages).
    // Only applies buyer-status and cap-based checks — NO state filtering since there is no
    // specific incoming lead to match against. This is "who's eligible right now in general",
    // not "who's eligible for one specific hypothetical lead."
    const entries = campaign.assignedBuyers || [];
    if (!entries.length) {
      return success(res, { nextBuyerId: null, reason: 'no_buyers' });
    }

    const buyerIds = entries.map((e) => e.buyerId._id);
    const buyers = await Buyer.find({ _id: { $in: buyerIds }, tenantId }).lean();
    const buyerMap = new Map(buyers.map((b) => [b._id.toString(), b]));

    const eligibleIds = [];
    for (const entry of entries) {
      const buyer = buyerMap.get(entry.buyerId._id.toString());
      if (!buyer) continue;
      if (buyer.status !== 'active') continue;
      // Cap check (same as capFilter stage)
      if (buyer.leadCap > 0 && buyer.leadsReceived >= buyer.leadCap) continue;
      if (buyer.dailyCap > 0 && buyer.dailyLeadsReceived >= buyer.dailyCap) continue;
      if (buyer.monthlyCap > 0 && buyer.monthlyLeadsReceived >= buyer.monthlyCap) continue;
      eligibleIds.push(entry.buyerId._id.toString());
    }

    if (!eligibleIds.length) {
      return success(res, { nextBuyerId: null, reason: 'no_eligible_buyers' });
    }

    const nextBuyerId = await campaignRepo.peekNextRoundRobinBuyer(campaign._id, eligibleIds);
    return success(res, { nextBuyerId });
  } catch (err) {
    return error(res, err.message);
  }
});

router.post('/', authorize('admin', 'member'), validate(createCampaign), async (req, res) => {
  try {
    const campaign = await campaignService.create({ ...req.body, createdBy: req.userId }, req.tenantId);
    return created(res, campaign);
  } catch (err) {
    return error(res, err.message, 400);
  }
});

router.put('/:id', authorize('admin', 'member'), validate(updateCampaign), async (req, res) => {
  try {
    const campaign = await campaignService.update(req.params.id, req.tenantId, req.body);
    if (!campaign) return notFound(res, 'Campaign not found');
    return success(res, campaign);
  } catch (err) {
    return error(res, err.message, 400);
  }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const result = await campaignService.delete(req.params.id, req.tenantId);
    if (!result) return notFound(res, 'Campaign not found');
    return success(res, { message: 'Campaign deleted' });
  } catch (err) {
    return error(res, err.message);
  }
});

router.post('/:id/buyers', authorize('admin', 'member'), async (req, res) => {
  try {
    const campaign = await campaignService.addBuyer(req.params.id, req.tenantId, req.body.buyerId, {
      weight: req.body.weight,
      priority: req.body.priority,
    });
    return success(res, campaign);
  } catch (err) {
    return error(res, err.message, 400);
  }
});

router.delete('/:id/buyers/:buyerId', authorize('admin', 'member'), async (req, res) => {
  try {
    const campaign = await campaignService.removeBuyer(req.params.id, req.tenantId, req.params.buyerId);
    return success(res, campaign);
  } catch (err) {
    return error(res, err.message);
  }
});

module.exports = router;
