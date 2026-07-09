const Lead = require('../models/Lead');
const Campaign = require('../models/Campaign');
const Client = require('../models/Client');

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

async function resolveCampaignCost(lead, campaign) {
  if (campaign?.costPerLead != null) return campaign.costPerLead;
  if (lead.campaignId) {
    const c = await Campaign.findById(lead.campaignId).select('costPerLead').lean();
    if (c?.costPerLead != null) return c.costPerLead;
  }
  if (lead.campaign) {
    const c = await Campaign.findOne({ name: lead.campaign, tenantId: lead.tenantId }).select('costPerLead').lean();
    if (c?.costPerLead != null) return c.costPerLead;
  }
  return 0;
}

async function resolveBuyerRevenue(buyer, bidAmount = null) {
  if (bidAmount != null && bidAmount > 0) return bidAmount;
  return buyer.pricePerLead || 0;
}

async function recordLeadFinancials(leadId, { buyer, campaign, bidAmount = null, financialStatus = 'accepted' }) {
  const lead = await Lead.findById(leadId);
  if (!lead) return null;

  const revenue = await resolveBuyerRevenue(buyer, bidAmount);
  const cost = await resolveCampaignCost(lead, campaign);
  const profit = round2(revenue - cost);

  lead.revenue = revenue;
  lead.cost = cost;
  lead.profit = profit;
  lead.bidAmount = bidAmount || revenue;
  lead.financialStatus = financialStatus;
  if (campaign?._id) {
    lead.campaignId = campaign._id;
    if (!lead.campaign) lead.campaign = campaign.name;
  }
  await lead.save();

  return { revenue, cost, profit, bidAmount: lead.bidAmount };
}

async function markLeadReturned(leadId, tenantId) {
  const lead = await Lead.findOne({ _id: leadId, tenantId });
  if (!lead) return null;
  lead.financialStatus = 'returned';
  lead.revenue = 0;
  lead.profit = round2(0 - (lead.cost || 0));
  await lead.save();
  return lead;
}

module.exports = {
  round2,
  recordLeadFinancials,
  markLeadReturned,
  resolveCampaignCost,
  resolveBuyerRevenue,
};
