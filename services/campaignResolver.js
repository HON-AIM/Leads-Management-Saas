const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');
const Client = require('../models/Client');

const LOG_PREFIX = '[CampaignResolver]';

function log(step, details = {}) {
  console.log(`${LOG_PREFIX} ${new Date().toISOString()} | ${step}`, details);
}

async function resolveCampaign(lead, tenantId) {
  if (!tenantId) return null;

  const source = (lead.source || '').toLowerCase().trim();
  const campaignRef = lead.campaign;

  if (campaignRef) {
    if (mongoose.Types.ObjectId.isValid(String(campaignRef))) {
      const byId = await Campaign.findOne({ _id: campaignRef, tenantId, status: 'active' }).lean();
      if (byId) {
        log('MATCHED_BY_ID', { campaignId: byId._id, name: byId.name });
        return byId;
      }
    }
    const byName = await Campaign.findOne({
      tenantId,
      status: 'active',
      name: { $regex: new RegExp(`^${String(campaignRef).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    }).lean();
    if (byName) {
      log('MATCHED_BY_NAME', { campaignId: byName._id, name: byName.name });
      return byName;
    }
  }

  if (source) {
    const bySource = await Campaign.findOne({
      tenantId,
      status: 'active',
      sources: source,
    }).lean();
    if (bySource) {
      log('MATCHED_BY_SOURCE', { campaignId: bySource._id, source });
      return bySource;
    }
  }

  const fallback = await Campaign.findOne({ tenantId, status: 'active' })
    .sort({ createdAt: 1 })
    .lean();

  if (fallback) {
    log('FALLBACK_CAMPAIGN', { campaignId: fallback._id, name: fallback.name });
  }

  return fallback;
}

async function loadCampaignBuyers(campaign, tenantId) {
  if (!campaign?.assignedBuyers?.length) {
    return Client.find({
      tenantId,
      status: { $ne: 'inactive' },
      isPaused: { $ne: true },
    }).sort({ priority: 1, name: 1 }).lean();
  }

  const buyerIds = campaign.assignedBuyers.map((b) => b.buyerId);
  const buyers = await Client.find({
    _id: { $in: buyerIds },
    tenantId,
    status: { $ne: 'inactive' },
    isPaused: { $ne: true },
  }).lean();

  const order = new Map(buyerIds.map((id, idx) => [String(id), idx]));
  buyers.sort((a, b) => (order.get(String(a._id)) ?? 99) - (order.get(String(b._id)) ?? 99));

  return buyers;
}

function applyCampaignWeights(buyers, campaign) {
  if (!campaign?.assignedBuyers?.length) return buyers;

  const weightMap = Object.fromEntries(
    campaign.assignedBuyers.map((b) => [String(b.buyerId), b.weight || 1])
  );

  return buyers.map((buyer) => ({
    ...buyer,
    weight: weightMap[String(buyer._id)] ?? buyer.weight ?? 1,
  }));
}

module.exports = {
  resolveCampaign,
  loadCampaignBuyers,
  applyCampaignWeights,
};
