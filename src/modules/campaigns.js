const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const campaignService = require('../services/campaignService');
const campaignRepo = require('../repositories/campaignRepository');
const Campaign = require('../models/Campaign');
const Buyer = require('../models/Buyer');
const Lead = require('../models/Lead');
const LeadAssignment = require('../models/LeadAssignment');
const RoutingLog = require('../models/RoutingLog');
const { success, created, error, notFound, paginated } = require('../utils/response');
const { validate } = require('../middleware/validate');
const { createCampaign, updateCampaign } = require('../middleware/validation/schemas');
const fieldDefinitionService = require('../services/fieldDefinitionService');

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
    const buyers = await Buyer.find({ _id: { $in: buyerIds }, tenantId: req.tenantId }).lean();
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

router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const campaign = await Campaign.findOne({ _id: id, tenantId });
    if (!campaign) return notFound(res, 'Campaign not found');

    const campaignObjectId = require('mongoose').Types.ObjectId.createFromHexString(id);
    const tenantObjectId = require('mongoose').Types.ObjectId.createFromHexString(tenantId.toString());

    const [leadCounts, assignmentStats, activeBuyers] = await Promise.all([
      Lead.aggregate([
        { $match: { campaignId: campaignObjectId, tenantId: tenantObjectId } },
        { $group: { _id: null, total: { $sum: 1 } } },
      ]),
      LeadAssignment.aggregate([
        { $match: { campaignId: campaignObjectId, tenantId: tenantObjectId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Buyer.countDocuments({
        _id: { $in: campaign.assignedBuyers.map((b) => b.buyerId) },
        tenantId,
        status: 'active',
      }),
    ]);

    const totalLeads = leadCounts[0]?.total || 0;
    const assignmentMap = {};
    for (const a of assignmentStats) { assignmentMap[a._id] = a.count; }
    const totalDelivered = assignmentMap['delivered'] || 0;
    const totalFailed = assignmentMap['failed'] || 0;
    const deliveryRate = (totalDelivered + totalFailed) > 0 ? (totalDelivered / (totalDelivered + totalFailed) * 100) : 0;

    return success(res, {
      leadsToday: campaign.leadsToday || 0,
      totalLeads,
      activeBuyers,
      deliveryRate: Math.round(deliveryRate * 10) / 10,
      totalDelivered,
      totalFailed,
    });
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/:id/costs', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const campaign = await Campaign.findOne({ _id: id, tenantId });
    if (!campaign) return notFound(res, 'Campaign not found');

    const campaignObjectId = require('mongoose').Types.ObjectId.createFromHexString(id);
    const tenantObjectId = require('mongoose').Types.ObjectId.createFromHexString(tenantId.toString());

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [costSummary, dailyTrend] = await Promise.all([
      LeadAssignment.aggregate([
        { $match: { campaignId: campaignObjectId, tenantId: tenantObjectId } },
        { $group: { _id: null, totalCost: { $sum: '$cost' }, totalRevenue: { $sum: '$revenue' }, count: { $sum: 1 } } },
      ]),
      LeadAssignment.aggregate([
        { $match: { campaignId: campaignObjectId, tenantId: tenantObjectId, createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            leads: { $sum: 1 },
            cost: { $sum: '$cost' },
            revenue: { $sum: '$revenue' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const summary = costSummary[0] || { totalCost: 0, totalRevenue: 0, count: 0 };
    return success(res, {
      costPerLead: campaign.costPerLead || 0,
      totalCost: summary.totalCost,
      totalRevenue: summary.totalRevenue,
      netMargin: summary.totalRevenue - summary.totalCost,
      totalAssignments: summary.count,
      dailyTrend,
    });
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/:id/buyer-distribution', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const campaign = await Campaign.findOne({ _id: id, tenantId });
    if (!campaign) return notFound(res, 'Campaign not found');

    const campaignObjectId = require('mongoose').Types.ObjectId.createFromHexString(id);
    const tenantObjectId = require('mongoose').Types.ObjectId.createFromHexString(tenantId.toString());

    const distribution = await LeadAssignment.aggregate([
      { $match: { campaignId: campaignObjectId, tenantId: tenantObjectId } },
      {
        $group: {
          _id: '$buyerId',
          total: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          revenue: { $sum: '$revenue' },
          cost: { $sum: '$cost' },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const buyerIds = distribution.map((d) => d._id);
    const buyers = buyerIds.length > 0
      ? await Buyer.find({ _id: { $in: buyerIds }, tenantId }).select('name email').lean()
      : [];
    const buyerMap = new Map(buyers.map((b) => [b._id.toString(), b]));

    const enriched = distribution.map((d) => ({
      ...d,
      buyer: buyerMap.get(d._id.toString()) || { name: 'Unknown', email: '' },
      deliveryRate: d.total > 0 ? Math.round((d.delivered / d.total) * 1000) / 10 : 0,
    }));

    const totalAssigned = distribution.reduce((sum, d) => sum + d.total, 0);
    const buyerCount = distribution.length;
    let fairness = null;
    if (campaign.routingMode === 'round_robin' && buyerCount > 1 && totalAssigned > 0) {
      const expected = totalAssigned / buyerCount;
      const maxDev = Math.max(...distribution.map((d) => Math.abs(d.total - expected)));
      const deviationPct = Math.round((maxDev / expected) * 100);
      fairness = { expectedPerBuyer: Math.round(expected), maxDeviationPct: deviationPct };
    }

    return success(res, { distribution: enriched, totalAssigned, fairness });
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/:id/routing-logs', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const campaign = await Campaign.findOne({ _id: id, tenantId });
    if (!campaign) return notFound(res, 'Campaign not found');

    const query = { campaignId: id, tenantId };
    const [logs, total] = await Promise.all([
      RoutingLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('leadId', 'name email state source status')
        .populate('selectedBuyerId', 'name email')
        .lean(),
      RoutingLog.countDocuments(query),
    ]);

    return paginated(res, { data: logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    return error(res, err.message);
  }
});

router.post('/', authorize('admin', 'member'), validate(createCampaign), async (req, res) => {
  try {
    const campaign = await campaignService.create({ ...req.body, createdBy: req.userId }, req.tenantId);
    await fieldDefinitionService.seedStandardFields(campaign._id, req.tenantId).catch(() => {});
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
