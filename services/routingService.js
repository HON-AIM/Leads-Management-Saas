const Client = require('../models/Client');
const Activity = require('../models/Activity');
const { filterEligibleFromList, findFallbackBuyer } = require('./buyerEligibilityService');
const { assignLeadIncrement, incrementBuyerUsage } = require('./capService');
const { getNextRoundRobinBuyer } = require('./roundRobinStateManager');
const { sendLeadAssignedEmail } = require('./emailService');
const { resolveCampaign, loadCampaignBuyers, applyCampaignWeights } = require('./campaignResolver');
const { runPingPostAuction } = require('./pingPostService');
const { recordLeadFinancials } = require('./financialService');
const OwnershipService = require('../src/services/ownership/ownershipService');

const LOG_PREFIX = '[RoutingService]';

function log(step, details = {}) {
  console.log(`${LOG_PREFIX} ${new Date().toISOString()} | ${step}`, details);
}

function selectWeighted(buyers) {
  const totalWeight = buyers.reduce((sum, b) => sum + (b.weight || 1), 0);
  let random = Math.random() * totalWeight;
  for (const buyer of buyers) {
    random -= buyer.weight || 1;
    if (random <= 0) return buyer;
  }
  return buyers[buyers.length - 1];
}

function selectPriority(buyers) {
  const sorted = [...buyers].sort((a, b) => (a.priority || 0) - (b.priority || 0));
  const topPriority = sorted[0].priority || 0;
  const topTier = sorted.filter((b) => (b.priority || 0) === topPriority);
  return topTier[Math.floor(Math.random() * topTier.length)];
}

function selectExclusive(buyers) {
  return buyers[0] || null;
}

async function selectByMode(buyers, mode, tenantId, leadState, leadCountry) {
  if (!buyers.length) return null;

  switch (mode) {
    case 'exclusive':
      return selectExclusive(buyers);
    case 'priority':
      return selectPriority(buyers);
    case 'weighted':
      return selectWeighted(buyers);
    case 'round_robin':
    default:
      return getNextRoundRobinBuyer(tenantId, leadState, leadCountry, buyers).catch(() => buyers[0]);
  }
}

/**
 * Lead Distro-style routing:
 * 1. Resolve campaign (by source/name)
 * 2. Filter buyers (state, caps, schedule)
 * 3. Apply campaign routing mode to pick one buyer
 */
async function routeLead(lead, tenantId) {
  const leadState = (lead.normalized_region_code || lead.state || '').toUpperCase();
  const leadCountry = (lead.normalized_country_code || 'US').toUpperCase();

  log('ROUTE_START', { leadId: lead._id, state: leadState, source: lead.source, campaign: lead.campaign });

  const campaign = await resolveCampaign(lead, tenantId);
  const routingMode = campaign?.routingMode || 'round_robin';

  let candidates = await loadCampaignBuyers(campaign, tenantId);
  candidates = applyCampaignWeights(candidates, campaign);

  log('CANDIDATES', { count: candidates.length, routingMode, campaign: campaign?.name || 'default' });

  let { eligible, reason, audit } = await filterEligibleFromList(candidates, lead, campaign);

  if (eligible.length === 0) {
    const fallback = await findFallbackBuyer(tenantId, campaign);
    if (fallback) {
      const fbCheck = await filterEligibleFromList([fallback], lead, null);
      if (fbCheck.eligible.length > 0) {
        eligible = fbCheck.eligible;
        reason = null;
        log('FALLBACK_BUYER', { buyer: fallback.name });
      }
    }
  }

  if (eligible.length === 0) {
    log('ROUTE_FAIL', { reason, auditCount: audit?.length });
    return {
      assignedTo: null,
      assignedBuyer: null,
      status: 'unassigned',
      reason: reason || 'no_eligible_buyers',
      routingMode,
      campaignId: campaign?._id || null,
      campaignName: campaign?.name || null,
      routingAudit: audit,
    };
  }

  if (routingMode === 'ping_post') {
    const auction = await runPingPostAuction(lead, tenantId, campaign, eligible);
    if (!auction.success || !auction.buyer) {
      return {
        assignedTo: null,
        assignedBuyer: null,
        status: 'unassigned',
        reason: auction.reason || 'ping_post_failed',
        routingMode,
        campaignId: campaign?._id || null,
        campaignName: campaign?.name || null,
        pingSessionId: auction.pingSessionId || null,
      };
    }
    return assignLeadToBuyer(lead, auction.buyer, tenantId, 'ping_post', campaign, {
      bidAmount: auction.winningBid,
      pingSessionId: auction.pingSessionId,
    });
  }

  const buyer = await selectByMode(eligible, routingMode, tenantId, leadState, leadCountry);

  if (!buyer) {
    return {
      assignedTo: null,
      assignedBuyer: null,
      status: 'unassigned',
      reason: 'routing_failure',
      routingMode,
      campaignId: campaign?._id || null,
      campaignName: campaign?.name || null,
    };
  }

  return assignLeadToBuyer(lead, buyer, tenantId, routingMode, campaign);
}

async function assignLeadToBuyer(lead, buyer, tenantId, routingMode, campaign = null, options = {}) {
  const { bidAmount = null, pingSessionId = null } = options;
  const result = {
    assignedTo: null,
    assignedBuyer: null,
    status: 'unassigned',
    reason: 'unknown',
    routingMode,
    campaignId: campaign?._id || null,
    campaignName: campaign?.name || null,
    pingSessionId,
    winningBid: bidAmount,
  };

  const updatedClient = await assignLeadIncrement(buyer._id, buyer.leadCap || 0);
  if (!updatedClient) {
    result.reason = 'buyer_at_capacity';
    return result;
  }

  try {
    await incrementBuyerUsage(buyer._id, tenantId);
  } catch (err) {
    log('CAP_INCREMENT_WARN', { error: err.message });
  }

  result.assignedTo = buyer._id;
  result.assignedBuyer = {
    id: buyer._id,
    name: buyer.name,
    email: buyer.email,
    state: buyer.state,
    country: buyer.country,
  };
  result.status = 'assigned';
  result.reason = 'assigned';

  if (lead._id && lead._id !== 'temp') {
    try {
      const financials = await recordLeadFinancials(lead._id, { buyer, campaign, bidAmount });
      result.financials = financials;
      if (pingSessionId) {
        await require('../models/Lead').findByIdAndUpdate(lead._id, { pingSessionId });
      }
    } catch (err) {
      log('FINANCIAL_WARN', { error: err.message });
    }
  }

  const campaignLabel = campaign?.name ? ` via ${campaign.name}` : '';

  try {
    await Activity.create({
      type: 'lead_assigned',
      message: `Lead ${lead.name} → ${buyer.name} (${routingMode.replace(/_/g, ' ')})${campaignLabel}`,
      clientId: buyer._id,
      leadId: lead._id,
      tenantId,
      metadata: {
        routingMode,
        campaignId: campaign?._id,
        campaignName: campaign?.name,
        leadState: lead.state,
        leadSource: lead.source,
      },
    });
  } catch (err) {
    log('ACTIVITY_WARN', { error: err.message });
  }

  if (buyer.email) {
    sendLeadAssignedEmail(buyer, {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      state: lead.state,
      createdAt: lead.createdAt,
    }).catch((err) => log('EMAIL_WARN', { error: err.message }));
  }

  OwnershipService.assignLeadOwner(lead._id, buyer, {
    tenantId,
    routingMethod: routingMode,
    sourcePlatform: lead.source || 'form',
    campaignId: campaign?._id,
    campaignName: campaign?.name,
    performedBy: 'system',
    notes: `Campaign routing (${routingMode})`,
  }).catch((err) => log('OWNERSHIP_WARN', { error: err.message }));

  log('ASSIGNED', { buyer: buyer.name, mode: routingMode, campaign: campaign?.name });
  return result;
}

async function getRoutingAudit(tenantId, limit = 50) {
  return Activity.find({ tenantId, type: 'lead_assigned' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('clientId', 'name email state')
    .populate('leadId', 'name email state source campaign')
    .lean();
}

async function getRoutingStateSummary(tenantId) {
  const { listStates } = require('./roundRobinStateManager');
  const states = await listStates(tenantId);
  const buyers = await Client.find({ tenantId, status: { $ne: 'inactive' } })
    .select('name state allowedStates status leadsReceived leadCap isPaused priority weight')
    .sort({ name: 1 })
    .lean();

  return {
    states: states.map((s) => ({
      country: s.country,
      state: s.state,
      lastIndex: s.lastIndex,
      updatedAt: s.updatedAt,
    })),
    buyers: buyers.map((b) => ({
      id: b._id,
      name: b.name,
      state: b.state,
      allowedStates: b.allowedStates,
      status: b.status,
      isPaused: b.isPaused,
      leadsReceived: b.leadsReceived,
      leadCap: b.leadCap,
      priority: b.priority,
      weight: b.weight,
    })),
  };
}

module.exports = {
  routeLead,
  assignLeadToBuyer,
  selectWeighted,
  selectPriority,
  getRoutingAudit,
  getRoutingStateSummary,
};
