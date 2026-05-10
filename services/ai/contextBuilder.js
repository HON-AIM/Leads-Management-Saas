const Lead = require('../../models/Lead');
const Client = require('../../models/Client');
const Tenant = require('../../models/Tenant');
const User = require('../../models/User');
const Activity = require('../../models/Activity');
const DeliveryLog = require('../../models/DeliveryLog');
const BuyerCap = require('../../models/BuyerCap');
const { getDeliveryStats, getFailedDeliveries } = require('../deliveryLogger');
const { getRoutingStateSummary } = require('../routingService');
const { getCapStatus } = require('../capService');
const { listStates } = require('../roundRobinStateManager');

const LOG_PREFIX = '[AIContext]';

function log(step, details = {}) {
  const ts = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${ts} | Step: ${step}`, details);
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return { start, end: new Date() };
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function buildSystemContext(tenantId) {
  log('BUILD_CONTEXT_START', { tenantId });

  const [
    tenant,
    tenantUsers,
    leadStats,
    clientStats,
    recentActivity,
    deliveryStatsResult,
    failedDeliveries,
    routingSummary,
    buyerCaps,
    stateRouting,
    sourceBreakdown,
    unassignedLeads,
    recentLeads
  ] = await Promise.all([
    Tenant.findById(tenantId).lean(),
    User.countDocuments({ tenantId, status: 'active' }),
    getLeadStats(tenantId),
    getClientStats(tenantId),
    getRecentActivity(tenantId, 10),
    getDeliveryStats(tenantId).catch(() => ({ total: 0, success: 0, failed: 0, retrying: 0 })),
    getFailedDeliveries(tenantId, 5).catch(() => []),
    getRoutingStateSummary(tenantId).catch(() => ({ states: [], buyers: [] })),
    getBuyerCapSummary(tenantId),
    listStates(tenantId).catch(() => []),
    getSourceBreakdown(tenantId),
    getUnassignedLeadSummary(tenantId),
    getRecentLeads(tenantId, 10)
  ]);

  const context = {
    system: {
      name: tenant?.name || 'Lead Distribution SaaS',
      plan: tenant?.subscription?.plan || 'free',
      status: tenant?.status || 'active',
      activeUsers: tenantUsers,
      settings: {
        maxUsers: tenant?.settings?.maxUsers,
        maxLeadsPerMonth: tenant?.settings?.maxLeadsPerMonth,
        features: tenant?.settings?.features
      }
    },
    leads: leadStats,
    clients: clientStats,
    delivery: {
      total: deliveryStatsResult.total,
      success: deliveryStatsResult.success,
      failed: deliveryStatsResult.failed,
      retrying: deliveryStatsResult.retrying,
      successRate: deliveryStatsResult.total > 0
        ? ((deliveryStatsResult.success / deliveryStatsResult.total) * 100).toFixed(1)
        : 'N/A',
      recentFailures: failedDeliveries.map(f => ({
        lead: f.leadId ? { name: f.leadId.name, email: f.leadId.email, state: f.leadId.state } : null,
        buyer: f.buyerId?.name || 'Unknown',
        error: f.error,
        attemptedAt: f.createdAt
      }))
    },
    routing: {
      stateCount: stateRouting.length,
      states: stateRouting.map(s => ({
        state: s.state,
        lastIndex: s.lastIndex,
        version: s.version
      })),
      buyers: routingSummary.buyers || [],
      unassignedLeads: unassignedLeads
    },
    buyers: buyerCaps,
    sources: sourceBreakdown,
    recentActivity: recentActivity.map(a => ({
      type: a.type,
      message: a.message,
      time: a.createdAt
    })),
    recentLeads: recentLeads.map(l => ({
      name: l.name,
      email: l.email,
      state: l.state,
      source: l.source,
      status: l.status,
      ingestionStatus: l.ingestionStatus,
      createdAt: l.createdAt
    }))
  };

  log('BUILD_CONTEXT_COMPLETE', {
    leadCount: context.leads.total,
    clientCount: context.clients.total,
    buyerCount: context.buyers.length,
    recentLeads: context.recentLeads.length
  });

  return context;
}

async function getLeadStats(tenantId) {
  const { start: todayStart } = todayRange();
  const weekAgo = daysAgo(7);
  const monthAgo = daysAgo(30);

  const [
    total, unassigned, assigned, pending,
    today, thisWeek, thisMonth,
    failedIngestion
  ] = await Promise.all([
    Lead.countDocuments({ tenantId }),
    Lead.countDocuments({ tenantId, status: 'unassigned' }),
    Lead.countDocuments({ tenantId, status: 'assigned' }),
    Lead.countDocuments({ tenantId, status: 'pending' }),
    Lead.countDocuments({ tenantId, createdAt: { $gte: todayStart } }),
    Lead.countDocuments({ tenantId, createdAt: { $gte: weekAgo } }),
    Lead.countDocuments({ tenantId, createdAt: { $gte: monthAgo } }),
    Lead.countDocuments({ tenantId, ingestionStatus: 'failed' })
  ]);

  return {
    total, unassigned, assigned, pending,
    today, thisWeek, thisMonth,
    failedIngestion,
    assignmentRate: total > 0 ? ((assigned / total) * 100).toFixed(1) : '0'
  };
}

async function getClientStats(tenantId) {
  const [total, active, paused, full, inactive, capExhausted] = await Promise.all([
    Client.countDocuments({ tenantId }),
    Client.countDocuments({ tenantId, status: 'active', isPaused: false }),
    Client.countDocuments({ tenantId, isPaused: true }),
    Client.countDocuments({ tenantId, status: 'full' }),
    Client.countDocuments({ tenantId, status: 'inactive' }),
    Client.countDocuments({
      tenantId,
      status: { $ne: 'inactive' },
      $expr: { $gte: ['$leadsReceived', '$leadCap'] }
    })
  ]);

  return {
    total, active, paused, full, inactive, capExhausted
  };
}

async function getRecentActivity(tenantId, limit = 10) {
  return Activity.find({ tenantId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

async function getBuyerCapSummary(tenantId) {
  const buyers = await Client.find({
    tenantId,
    status: { $ne: 'inactive' }
  })
    .select('name state leadCap leadsReceived dailyCap dailyLeadsReceived monthlyCap monthlyLeadsReceived status isPaused routingMode')
    .sort({ name: 1 })
    .lean();

  const summary = buyers.map(b => {
    const lifetimeUtil = b.leadCap > 0 ? ((b.leadsReceived / b.leadCap) * 100).toFixed(1) : 'unlimited';
    const dailyUtil = b.dailyCap > 0 ? ((b.dailyLeadsReceived / b.dailyCap) * 100).toFixed(1) : 'unlimited';
    const monthlyUtil = b.monthlyCap > 0 ? ((b.monthlyLeadsReceived / b.monthlyCap) * 100).toFixed(1) : 'unlimited';

    return {
      name: b.name,
      state: b.state,
      routingMode: b.routingMode,
      status: b.isPaused ? 'paused' : b.status,
      caps: {
        lifetime: { cap: b.leadCap, used: b.leadsReceived, utilization: lifetimeUtil },
        daily: { cap: b.dailyCap, used: b.dailyLeadsReceived, utilization: dailyUtil },
        monthly: { cap: b.monthlyCap, used: b.monthlyLeadsReceived, utilization: monthlyUtil }
      }
    };
  });

  return summary;
}

async function getSourceBreakdown(tenantId) {
  const sources = await Lead.aggregate([
    { $match: { tenantId } },
    { $group: {
      _id: '$source',
      count: { $sum: 1 },
      assigned: { $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] } },
      unassigned: { $sum: { $cond: [{ $eq: ['$status', 'unassigned'] }, 1, 0] } },
      failed: { $sum: { $cond: [{ $eq: ['$ingestionStatus', 'failed'] }, 1, 0] } },
      duplicate: { $sum: { $cond: [{ $eq: ['$ingestionStatus', 'duplicate'] }, 1, 0] } }
    }},
    { $sort: { count: -1 } }
  ]);

  const totalLeads = sources.reduce((sum, s) => sum + s.count, 0);

  return sources.map(s => ({
    source: s._id || 'unknown',
    count: s.count,
    percentage: totalLeads > 0 ? ((s.count / totalLeads) * 100).toFixed(1) : '0',
    assigned: s.assigned,
    unassigned: s.unassigned,
    failed: s.failed,
    duplicate: s.duplicate,
    assignmentRate: s.count > 0 ? ((s.assigned / s.count) * 100).toFixed(1) : '0'
  }));
}

async function getUnassignedLeadSummary(tenantId) {
  const unassigned = await Lead.find({ tenantId, status: 'unassigned' })
    .select('name email state source createdAt')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const stateBreakdown = await Lead.aggregate([
    { $match: { tenantId, status: 'unassigned' } },
    { $group: { _id: '$state', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  return {
    total: unassigned.length,
    byState: stateBreakdown.map(s => ({ state: s._id, count: s.count })),
    recent: unassigned.map(l => ({
      name: l.name,
      state: l.state,
      source: l.source,
      createdAt: l.createdAt
    }))
  };
}

async function getRecentLeads(tenantId, limit = 10) {
  return Lead.find({ tenantId })
    .select('name email state source status ingestionStatus createdAt')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

async function getDiagnosticSummary(tenantId) {
  const context = await buildSystemContext(tenantId);

  const issues = [];

  if (context.leads.unassigned > 0) {
    issues.push({
      severity: context.leads.unassigned > 50 ? 'high' : 'medium',
      category: 'routing',
      message: `${context.leads.unassigned} leads are unassigned`,
      details: `Unassigned by state: ${context.routing.unassignedLeads.byState.map(s => `${s.state} (${s.count})`).join(', ')}`
    });
  }

  const cappedBuyers = context.buyers.filter(b =>
    b.caps.lifetime.utilization !== 'unlimited' && parseFloat(b.caps.lifetime.utilization) >= 80
  );
  if (cappedBuyers.length > 0) {
    issues.push({
      severity: 'medium',
      category: 'capacity',
      message: `${cappedBuyers.length} buyers at ≥80% lifetime cap utilization`,
      details: cappedBuyers.map(b => `${b.name} (${b.caps.lifetime.utilization}%)`).join(', ')
    });
  }

  if (context.delivery.failed > 0) {
    issues.push({
      severity: context.delivery.failed > 20 ? 'high' : 'low',
      category: 'delivery',
      message: `${context.delivery.failed} failed deliveries (${context.delivery.successRate}% success rate)`,
      details: 'Review recent failure logs for provider-specific issues'
    });
  }

  const imbalancedStates = context.routing.states.filter(s => {
    const stateBuyers = context.routing.buyers.filter(b =>
      b.state === s.state || b.allowedStates?.includes(s.state)
    );
    return stateBuyers.length === 0;
  });
  if (imbalancedStates.length > 0) {
    issues.push({
      severity: 'high',
      category: 'coverage',
      message: `${imbalancedStates.length} states have no buyers`,
      details: `States with no coverage: ${imbalancedStates.map(s => s.state).join(', ')}`
    });
  }

  return {
    healthy: issues.filter(i => i.severity === 'high').length === 0,
    issueCount: issues.length,
    highPriorityCount: issues.filter(i => i.severity === 'high').length,
    issues
  };
}

module.exports = {
  buildSystemContext,
  getLeadStats,
  getClientStats,
  getRecentActivity,
  getBuyerCapSummary,
  getSourceBreakdown,
  getUnassignedLeadSummary,
  getRecentLeads,
  getDiagnosticSummary
};
