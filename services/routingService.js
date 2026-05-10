const Client = require('../models/Client');
const Activity = require('../models/Activity');
const { getEligibleBuyers, findFallbackBuyers } = require('./buyerEligibilityService');
const { assignLeadIncrement, incrementBuyerUsage } = require('./capService');
const { getNextRoundRobinBuyer } = require('./roundRobinStateManager');
const { sendLeadAssignedEmail } = require('./emailService');

const LOG_PREFIX = '[RoutingService]';

function log(step, details = {}) {
  const ts = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${ts} | Step: ${step}`, details);
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
  const topTier = sorted.filter(b => (b.priority || 0) === topPriority);
  return topTier[Math.floor(Math.random() * topTier.length)];
}

function selectExclusive(buyers) {
  const sorted = [...buyers].sort((a, b) => (a.priority || 0) - (b.priority || 0));
  const exclusives = sorted.filter(b => b.routingMode === 'exclusive');
  if (exclusives.length === 0) return null;
  const topTier = [exclusives[0]];
  for (let i = 1; i < exclusives.length; i++) {
    if ((exclusives[i].priority || 0) === (exclusives[0].priority || 0)) {
      topTier.push(exclusives[i]);
    }
  }
  return topTier[Math.floor(Math.random() * topTier.length)];
}

function selectByMode(buyers, mode) {
  switch (mode) {
    case 'weighted':
      return selectWeighted(buyers);
    case 'priority':
      return selectPriority(buyers);
    case 'exclusive':
      return selectExclusive(buyers);
    default:
      return null;
  }
}

function groupByMode(buyers) {
  const grouped = { round_robin: [], weighted: [], priority: [], exclusive: [] };

  for (const buyer of buyers) {
    const mode = buyer.routingMode || 'round_robin';
    if (grouped[mode]) {
      grouped[mode].push(buyer);
    } else {
      grouped.round_robin.push(buyer);
    }
  }

  return grouped;
}

async function selectRoundRobinBuyer(tenantId, leadState, rrBuyers) {
  if (!rrBuyers || rrBuyers.length === 0) return null;

  try {
    const buyer = await getNextRoundRobinBuyer(tenantId, leadState, rrBuyers);
    return buyer;
  } catch (err) {
    log('ROUND_ROBIN_ERROR', { error: err.message, buyerCount: rrBuyers.length });
    return rrBuyers[0] || null;
  }
}

async function routeLead(lead, tenantId) {
  // Use normalized region code if available, fall back to raw state
  const leadState = lead.normalized_region_code || lead.state;
  const result = {
    assignedTo: null,
    assignedBuyer: null,
    status: 'unassigned',
    reason: 'unknown',
    routingMode: null,
  };

  log('ROUTE_START', { leadId: lead._id, state: leadState, tenantId });

  const { eligible, reason: eligibilityReason } = await getEligibleBuyers(tenantId, leadState);

  if (eligible.length === 0) {
    log('NO_ELIGIBLE', { reason: eligibilityReason });

    const fallbackBuyers = await findFallbackBuyers(tenantId, []);
    if (fallbackBuyers.length > 0) {
      log('FALLBACK_FOUND', { count: fallbackBuyers.length });
      const fallbackResult = await selectFallbackBuyer(tenantId, leadState, fallbackBuyers);
      if (fallbackResult) {
        return await assignLeadToBuyer(lead, fallbackResult, tenantId, 'fallback');
      }
    }

    result.reason = eligibilityReason || 'no_eligible_buyers';
    log('ROUTE_FAIL', { reason: result.reason });
    return result;
  }

  log('ELIGIBLE_BUYERS', { count: eligible.length });

  const grouped = groupByMode(eligible);
  log('MODE_GROUPS', {
    round_robin: grouped.round_robin.length,
    weighted: grouped.weighted.length,
    priority: grouped.priority.length,
    exclusive: grouped.exclusive.length,
  });

  const exclusiveBuyer = selectByMode(eligible, 'exclusive');
  if (exclusiveBuyer) {
    log('EXCLUSIVE_SELECT', { buyer: exclusiveBuyer.name, priority: exclusiveBuyer.priority });
    return await assignLeadToBuyer(lead, exclusiveBuyer, tenantId, 'exclusive');
  }

  const priorityBuyer = selectByMode(grouped.priority, 'priority');
  if (priorityBuyer) {
    log('PRIORITY_SELECT', { buyer: priorityBuyer.name, priority: priorityBuyer.priority });
    return await assignLeadToBuyer(lead, priorityBuyer, tenantId, 'priority');
  }

  if (grouped.weighted.length > 0) {
    const weightedBuyer = selectByMode(grouped.weighted, 'weighted');
    log('WEIGHTED_SELECT', { buyer: weightedBuyer.name, weight: weightedBuyer.weight });
    return await assignLeadToBuyer(lead, weightedBuyer, tenantId, 'weighted');
  }

  if (grouped.round_robin.length > 0) {
    const rrBuyer = await selectRoundRobinBuyer(tenantId, leadState, grouped.round_robin);
    if (rrBuyer) {
      log('ROUND_ROBIN_SELECT', { buyer: rrBuyer.name });
      return await assignLeadToBuyer(lead, rrBuyer, tenantId, 'round_robin');
    }
  }

  result.reason = 'routing_failure_all_modes_exhausted';
  log('ROUTE_FAIL', { reason: result.reason });
  return result;
}

async function selectFallbackBuyer(tenantId, leadState, fallbackBuyers) {
  const grouped = groupByMode(fallbackBuyers);

  if (grouped.exclusive.length > 0) {
    return selectByMode(fallbackBuyers, 'exclusive');
  }

  if (grouped.priority.length > 0) {
    return selectByMode(grouped.priority, 'priority');
  }

  if (grouped.weighted.length > 0) {
    return selectByMode(grouped.weighted, 'weighted');
  }

  if (grouped.round_robin.length > 0) {
    return selectRoundRobinBuyer(tenantId, leadState, grouped.round_robin);
  }

  return fallbackBuyers[0] || null;
}

async function assignLeadToBuyer(lead, buyer, tenantId, routingMode) {
  const result = {
    assignedTo: null,
    assignedBuyer: null,
    status: 'unassigned',
    reason: 'unknown',
    routingMode,
  };

  const leadCap = buyer.leadCap || 0;

  const updatedClient = await assignLeadIncrement(buyer._id, leadCap);

  if (!updatedClient) {
    log('RACE_CONDITION', { buyerId: buyer._id, buyerName: buyer.name, leadCap });
    result.reason = 'race_condition';
    return result;
  }

  try {
    await incrementBuyerUsage(buyer._id, tenantId);
  } catch (err) {
    log('CAP_INCREMENT_WARN', { buyerId: buyer._id, error: err.message });
  }

  result.assignedTo = buyer._id;
  result.assignedBuyer = { id: buyer._id, name: buyer.name, email: buyer.email, state: buyer.state };
  result.status = 'assigned';
  result.reason = 'assigned';

  try {
    await Activity.create({
      type: 'lead_assigned',
      message: `Lead ${lead.name} assigned to ${buyer.name} (${routingMode})`,
      clientId: buyer._id,
      leadId: lead._id,
      tenantId,
      metadata: {
        routingMode,
        leadEmail: lead.email,
        leadState: lead.state,
        leadSource: lead.source,
        buyerState: buyer.state,
        buyerEmail: buyer.email,
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
    }).catch(err => log('EMAIL_WARN', { error: err.message }));
  }

  log('ASSIGNED', { buyer: buyer.name, mode: routingMode, leadId: lead._id, state: leadStateForLog(buyer, lead) });
  return result;
}

function leadStateForLog(buyer, lead) {
  if (buyer.allowedStates?.length > 0) {
    return `${lead.state}→allowed(${buyer.allowedStates.join(',')})`;
  }
  return `${lead.state}→${buyer.state}`;
}

async function getRoutingAudit(tenantId, limit = 50) {
  return Activity.find({
    tenantId,
    type: 'lead_assigned',
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('clientId', 'name email state routingMode')
    .populate('leadId', 'name email state source')
    .lean();
}

async function getRoutingStateSummary(tenantId) {
  const { listStates } = require('./roundRobinStateManager');
  const states = await listStates(tenantId);

  const buyers = await Client.find({ tenantId, status: { $ne: 'inactive' } })
    .select('name state routingMode weight priority allowedStates status leadsReceived leadCap isPaused')
    .sort({ name: 1 })
    .lean();

  return {
    states: states.map(s => ({
      state: s.state,
      lastIndex: s.lastIndex,
      version: s.version,
      updatedAt: s.updatedAt,
    })),
    buyers: buyers.map(b => ({
      id: b._id,
      name: b.name,
      state: b.state,
      routingMode: b.routingMode,
      weight: b.weight,
      priority: b.priority,
      allowedStates: b.allowedStates,
      status: b.status,
      isPaused: b.isPaused,
      leadsReceived: b.leadsReceived,
      leadCap: b.leadCap,
    })),
  };
}

module.exports = {
  routeLead,
  assignLeadToBuyer,
  selectWeighted,
  selectPriority,
  selectExclusive,
  selectByMode,
  groupByMode,
  getRoutingAudit,
  getRoutingStateSummary,
};
