const Lead = require('../../models/Lead');
const Client = require('../../models/Client');
const DeliveryLog = require('../../models/DeliveryLog');
const AnalyticsCache = require('../../models/AnalyticsCache');

const LOG_PREFIX = '[AggregationService]';

function log(step, details = {}) {
  const ts = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${ts} | Step: ${step}`, details);
}

function getDateRange(type, date = new Date()) {
  const start = new Date(date);
  const end = new Date(date);

  switch (type) {
    case 'daily':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      start.setMonth(start.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

async function aggregateLeadVolume(tenantId, type) {
  const { start, end } = getDateRange(type);

  const pipeline = [
    {
      $match: {
        tenantId,
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $facet: {
        total: [{ $count: 'count' }],
        bySource: [
          { $group: { _id: '$source', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $project: { source: '$_id', count: 1, _id: 0 } },
        ],
        byState: [
          { $group: { _id: '$state', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $project: { state: '$_id', count: 1, _id: 0 } },
        ],
        byCampaign: [
          { $match: { campaign: { $ne: null, $ne: '' } } },
          { $group: { _id: '$campaign', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $project: { campaign: '$_id', count: 1, _id: 0 } },
        ],
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $project: { status: '$_id', count: 1, _id: 0 } },
        ],
        byIngestionStatus: [
          { $group: { _id: '$ingestionStatus', count: { $sum: 1 } } },
          { $project: { status: '$_id', count: 1, _id: 0 } },
        ],
        byDeliveryStatus: [
          { $group: { _id: '$deliveryStatus', count: { $sum: 1 } } },
          { $project: { status: '$_id', count: 1, _id: 0 } },
        ],
      },
    },
  ];

  const [result] = await Lead.aggregate(pipeline);

  return {
    period: { start, end },
    total: result.total[0]?.count || 0,
    bySource: result.bySource,
    byState: result.byState,
    byCampaign: result.byCampaign,
    byStatus: result.byStatus,
    byIngestionStatus: result.byIngestionStatus,
    byDeliveryStatus: result.byDeliveryStatus,
  };
}

async function aggregateDeliveryStats(tenantId, type) {
  const { start, end } = getDateRange(type);

  const pipeline = [
    {
      $match: {
        tenantId,
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $facet: {
        total: [{ $count: 'count' }],
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 }, avgDuration: { $avg: '$duration' } } },
          { $project: { status: '$_id', count: 1, avgDuration: { $ifNull: [{ $round: ['$avgDuration', 0] }, 0] }, _id: 0 } },
        ],
        byProvider: [
          { $group: { _id: { provider: '$provider', status: '$status' }, count: { $sum: 1 } } },
          { $sort: { '_id.provider': 1 } },
        ],
        failures: [
          { $match: { status: 'failed' } },
          { $group: { _id: '$error', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          { $project: { error: '$_id', count: 1, _id: 0 } },
        ],
        avgDuration: [{ $group: { _id: null, avg: { $avg: '$duration' }, max: { $max: '$duration' }, min: { $min: '$duration' } } }],
      },
    },
  ];

  const [result] = await DeliveryLog.aggregate(pipeline);
  const total = result.total[0]?.count || 0;
  const successEntry = result.byStatus.find(s => s.status === 'success');
  const failedEntry = result.byStatus.find(s => s.status === 'failed');
  const successCount = successEntry?.count || 0;
  const failedCount = failedEntry?.count || 0;

  const providers = {};
  for (const p of result.byProvider) {
    const name = p._id.provider;
    if (!providers[name]) providers[name] = { provider: name, success: 0, failed: 0, total: 0 };
    providers[name][p._id.status] = (providers[name][p._id.status] || 0) + p.count;
    providers[name].total += p.count;
  }
  for (const p of Object.values(providers)) {
    p.successRate = p.total > 0 ? parseFloat(((p.success / p.total) * 100).toFixed(2)) : 0;
  }

  return {
    period: { start, end },
    total,
    success: successCount,
    failed: failedCount,
    successRate: total > 0 ? parseFloat(((successCount / total) * 100).toFixed(2)) : 0,
    failureRate: total > 0 ? parseFloat(((failedCount / total) * 100).toFixed(2)) : 0,
    byStatus: result.byStatus,
    byProvider: Object.values(providers),
    topFailures: result.failures,
    duration: result.avgDuration[0]
      ? { avg: Math.round(result.avgDuration[0].avg), max: result.avgDuration[0].max || 0, min: result.avgDuration[0].min || 0 }
      : { avg: 0, max: 0, min: 0 },
  };
}

async function aggregateBuyerStats(tenantId, type) {
  const { start, end } = getDateRange(type);

  const pipeline = [
    {
      $match: {
        tenantId,
        createdAt: { $gte: start, $lte: end },
        assignedTo: { $ne: null },
      },
    },
    {
      $group: {
        _id: '$assignedTo',
        leadsReceived: { $sum: 1 },
        delivered: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'failed'] }, 1, 0] } },
        converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
        contacted: { $sum: { $cond: [{ $eq: ['$status', 'contacted'] }, 1, 0] } },
      },
    },
    {
      $lookup: {
        from: 'clients',
        localField: '_id',
        foreignField: '_id',
        as: 'buyer',
      },
    },
    { $unwind: { path: '$buyer', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        buyerId: '$_id',
        buyerName: '$buyer.name',
        buyerState: '$buyer.state',
        routingMode: '$buyer.routingMode',
        leadsReceived: 1,
        delivered: 1,
        failed: 1,
        converted: 1,
        contacted: 1,
        deliveryRate: {
          $cond: [{ $gt: ['$leadsReceived', 0] }, { $multiply: [{ $divide: ['$delivered', '$leadsReceived'] }, 100] }, 0],
        },
        conversionRate: {
          $cond: [{ $gt: ['$leadsReceived', 0] }, { $multiply: [{ $divide: ['$converted', '$leadsReceived'] }, 100] }, 0],
        },
      },
    },
    { $sort: { leadsReceived: -1 } },
  ];

  const buyers = await Lead.aggregate(pipeline);
  const totalBuyers = await Client.countDocuments({ tenantId, status: { $ne: 'inactive' } });
  const activeBuyers = await Client.countDocuments({ tenantId, status: 'active', isPaused: false });

  return {
    period: { start, end },
    totalBuyers,
    activeBuyers,
    activeInPeriod: buyers.length,
    performance: buyers,
  };
}

async function aggregateConversionFunnel(tenantId, type) {
  const { start, end } = getDateRange(type);

  const pipeline = [
    { $match: { tenantId, createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: null,
        received: { $sum: 1 },
        assigned: { $sum: { $cond: [{ $ne: ['$assignedTo', null] }, 1, 0] } },
        contacted: { $sum: { $cond: [{ $eq: ['$status', 'contacted'] }, 1, 0] } },
        converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'failed'] }, 1, 0] } },
        duplicate: { $sum: { $cond: [{ $eq: ['$ingestionStatus', 'duplicate'] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        received: 1,
        assigned: 1,
        contacted: 1,
        converted: 1,
        delivered: 1,
        failed: 1,
        duplicate: 1,
        assignmentRate: {
          $cond: [{ $gt: ['$received', 0] }, { $multiply: [{ $divide: ['$assigned', '$received'] }, 100] }, 0],
        },
        deliveryRate: {
          $cond: [{ $gt: ['$assigned', 0] }, { $multiply: [{ $divide: ['$delivered', '$assigned'] }, 100] }, 0],
        },
        contactRate: {
          $cond: [{ $gt: ['$delivered', 0] }, { $multiply: [{ $divide: ['$contacted', '$delivered'] }, 100] }, 0],
        },
        conversionRate: {
          $cond: [{ $gt: ['$contacted', 0] }, { $multiply: [{ $divide: ['$converted', '$contacted'] }, 100] }, 0],
        },
        overallConversionRate: {
          $cond: [{ $gt: ['$received', 0] }, { $multiply: [{ $divide: ['$converted', '$received'] }, 100] }, 0],
        },
      },
    },
  ];

  const [result] = await Lead.aggregate(pipeline);
  return result || { received: 0, assigned: 0, contacted: 0, converted: 0, delivered: 0, failed: 0, duplicate: 0, assignmentRate: 0, deliveryRate: 0, contactRate: 0, conversionRate: 0, overallConversionRate: 0 };
}

async function aggregateRoutingDistribution(tenantId, type) {
  const { start, end } = getDateRange(type);

  const pipeline = [
    {
      $match: {
        tenantId,
        createdAt: { $gte: start, $lte: end },
        assignedTo: { $ne: null },
      },
    },
    {
      $group: {
        _id: { buyer: '$assignedTo', source: '$source' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    {
      $lookup: {
        from: 'clients',
        localField: '_id.buyer',
        foreignField: '_id',
        as: 'buyer',
      },
    },
    { $unwind: { path: '$buyer', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        buyerId: '$_id.buyer',
        buyerName: '$buyer.name',
        buyerState: '$buyer.state',
        routingMode: '$buyer.routingMode',
        source: '$_id.source',
        count: 1,
        _id: 0,
      },
    },
  ];

  const distribution = await Lead.aggregate(pipeline);

  const byBuyer = {};
  for (const d of distribution) {
    const id = d.buyerId.toString();
    if (!byBuyer[id]) {
      byBuyer[id] = {
        buyerId: d.buyerId,
        buyerName: d.buyerName,
        buyerState: d.buyerState,
        routingMode: d.routingMode,
        total: 0,
        bySource: {},
      };
    }
    byBuyer[id].total += d.count;
    byBuyer[id].bySource[d.source] = (byBuyer[id].bySource[d.source] || 0) + d.count;
  }

  return {
    period: { start, end },
    raw: distribution,
    byBuyer: Object.values(byBuyer).sort((a, b) => b.total - a.total),
  };
}

async function runAggregation(tenantId, type) {
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  log(`${typeLabel.toUpperCase()}_AGG_START`, { tenantId, type });

  try {
    const [leadVolume, deliveryStats, buyerStats, conversionFunnel, routingDistribution] = await Promise.all([
      aggregateLeadVolume(tenantId, type),
      aggregateDeliveryStats(tenantId, type),
      aggregateBuyerStats(tenantId, type),
      aggregateConversionFunnel(tenantId, type),
      aggregateRoutingDistribution(tenantId, type),
    ]);

    const data = { leadVolume, deliveryStats, buyerStats, conversionFunnel, routingDistribution };

    const periodKey = (() => {
      const d = new Date();
      switch (type) {
        case 'daily': return d.toISOString().slice(0, 10);
        case 'weekly': { const w = getWeekNumber(d); return `${d.getFullYear()}-W${String(w).padStart(2, '0')}`; }
        case 'monthly': return d.toISOString().slice(0, 7);
        default: return d.toISOString().slice(0, 10);
      }
    })();

    await AnalyticsCache.updateOne(
      { tenantId, type, period: periodKey },
      {
        $set: {
          data,
          computedAt: new Date(),
          expiresAt: type === 'daily'
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            : type === 'weekly'
              ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      },
      { upsert: true }
    );

    log(`${typeLabel.toUpperCase()}_AGG_DONE`, { tenantId, type, periodKey });
    return { success: true, type, periodKey, data };
  } catch (err) {
    log(`${typeLabel.toUpperCase()}_AGG_ERROR`, { tenantId, type, error: err.message });
    return { success: false, type, error: err.message };
  }
}

async function runAllTenantAggregations(type) {
  const tenants = await require('../../models/Tenant').find({ status: 'active' }).select('_id').lean();
  log('RUN_ALL_TENANTS', { type, tenantCount: tenants.length });

  const results = [];
  for (const tenant of tenants) {
    const result = await runAggregation(tenant._id, type);
    results.push(result);
  }

  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  log('RUN_ALL_TENANTS_DONE', { type, succeeded, failed });

  return { success: true, type, total: results.length, succeeded, failed };
}

async function getAggregatedStats(tenantId, type, period) {
  const cache = await AnalyticsCache.findOne({ tenantId, type, period }).lean();
  if (!cache) return null;
  return { ...cache.data, computedAt: cache.computedAt };
}

async function listAvailableAggregations(tenantId, type) {
  const caches = await AnalyticsCache.find({ tenantId, type })
    .select('period computedAt')
    .sort({ computedAt: -1 })
    .limit(90)
    .lean();
  return caches;
}

function getWeekNumber(d) {
  const copy = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  return Math.ceil((((copy - yearStart) / 86400000) + 1) / 7);
}

module.exports = {
  runAggregation,
  runAllTenantAggregations,
  getAggregatedStats,
  listAvailableAggregations,
  aggregateLeadVolume,
  aggregateDeliveryStats,
  aggregateBuyerStats,
  aggregateConversionFunnel,
  aggregateRoutingDistribution,
};
