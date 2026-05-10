const DeliveryLog = require('../../models/DeliveryLog');
const Lead = require('../../models/Lead');

const LOG_PREFIX = '[DeliveryAnalytics]';

function dateRange(period) {
  const now = new Date();
  const start = new Date(now);
  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    case '7d':
      start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0);
      return { start, end: now };
    case '30d':
      start.setDate(start.getDate() - 30); start.setHours(0, 0, 0, 0);
      return { start, end: now };
    case '90d':
      start.setDate(start.getDate() - 90); start.setHours(0, 0, 0, 0);
      return { start, end: now };
    default:
      start.setDate(start.getDate() - 30); start.setHours(0, 0, 0, 0);
      return { start, end: now };
  }
}

function buildMatchStage(tenantId, period) {
  const { start, end } = dateRange(period);
  return { tenantId: tenantId, createdAt: { $gte: start, $lte: end } };
}

async function getDeliveryRates(tenantId, period = '30d') {
  const match = buildMatchStage(tenantId, period);

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' },
        minDuration: { $min: '$duration' },
        maxDuration: { $max: '$duration' },
      },
    },
  ];

  const results = await DeliveryLog.aggregate(pipeline);

  const stats = { success: 0, failed: 0, retrying: 0, total: 0 };
  let totalDuration = 0;
  let durationCount = 0;

  for (const r of results) {
    stats[r._id] = r.count;
    stats.total += r.count;
    if (r.avgDuration) {
      totalDuration += r.avgDuration * r.count;
      durationCount += r.count;
    }
  }

  const successRate = stats.total > 0 ? parseFloat(((stats.success / stats.total) * 100).toFixed(2)) : 0;
  const failureRate = stats.total > 0 ? parseFloat(((stats.failed / stats.total) * 100).toFixed(2)) : 0;
  const avgDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

  return { ...stats, successRate, failureRate, avgDuration };
}

async function getDeliveryByProvider(tenantId, period = '30d') {
  const match = buildMatchStage(tenantId, period);

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: { provider: '$provider', status: '$status' },
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' },
      },
    },
    { $sort: { '_id.provider': 1, '_id.status': 1 } },
  ];

  const results = await DeliveryLog.aggregate(pipeline);

  const grouped = {};
  for (const r of results) {
    const prov = r._id.provider;
    if (!grouped[prov]) grouped[prov] = { provider: prov, success: 0, failed: 0, total: 0, avgDuration: 0 };
    grouped[prov][r._id.status] = (grouped[prov][r._id.status] || 0) + r.count;
    grouped[prov].total += r.count;
    if (r.avgDuration) grouped[prov].avgDuration = Math.round(r.avgDuration);
  }

  for (const prov of Object.values(grouped)) {
    prov.successRate = prov.total > 0 ? parseFloat(((prov.success / prov.total) * 100).toFixed(2)) : 0;
  }

  return Object.values(grouped);
}

async function getFailedDeliveries(tenantId, period = '30d') {
  const match = buildMatchStage(tenantId, period);
  match.status = 'failed';

  const pipeline = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $limit: 100 },
    {
      $lookup: {
        from: 'leads',
        localField: 'leadId',
        foreignField: '_id',
        as: 'lead',
      },
    },
    { $unwind: { path: '$lead', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        leadId: 1,
        buyerId: 1,
        provider: 1,
        attempt: 1,
        error: 1,
        responseCode: 1,
        duration: 1,
        createdAt: 1,
        leadName: '$lead.name',
        leadEmail: '$lead.email',
        leadState: '$lead.state',
      },
    },
  ];

  return DeliveryLog.aggregate(pipeline);
}

async function getDeliveryTrend(tenantId, period = '30d') {
  const match = buildMatchStage(tenantId, period);

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          status: '$status',
        },
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' },
      },
    },
    { $sort: { '_id.date': 1 } },
  ];

  const results = await DeliveryLog.aggregate(pipeline);

  const trendMap = {};
  for (const r of results) {
    const date = r._id.date;
    if (!trendMap[date]) trendMap[date] = { date, success: 0, failed: 0, total: 0, avgDuration: 0 };
    trendMap[date][r._id.status] = (trendMap[date][r._id.status] || 0) + r.count;
    trendMap[date].total += r.count;
    if (r.avgDuration) trendMap[date].avgDuration = Math.round(r.avgDuration);
  }

  return Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));
}

async function getDeliverySummary(tenantId, period = '30d') {
  const { start, end } = dateRange(period);

  const [rates, byProvider, trend] = await Promise.all([
    getDeliveryRates(tenantId, period),
    getDeliveryByProvider(tenantId, period),
    getDeliveryTrend(tenantId, period),
  ]);

  return {
    period: { start, end },
    rates,
    byProvider,
    trend,
  };
}

async function getDeliveryTimeDistribution(tenantId, period = '30d') {
  const match = buildMatchStage(tenantId, period);

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: { $hour: '$createdAt' },
        total: { $sum: 1 },
        success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        avgDuration: { $avg: '$duration' },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        hour: '$_id',
        total: 1,
        success: 1,
        failed: 1,
        avgDuration: { $ifNull: [{ $round: ['$avgDuration', 0] }, 0] },
        successRate: {
          $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$success', '$total'] }, 100] }, 0],
        },
        _id: 0,
      },
    },
  ];

  return DeliveryLog.aggregate(pipeline);
}

async function getRetryAnalytics(tenantId, period = '30d') {
  const match = buildMatchStage(tenantId, period);

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: '$attempt',
        count: { $sum: 1 },
        success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        avgDuration: { $avg: '$duration' },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        attempt: '$_id',
        count: 1,
        success: 1,
        failed: 1,
        avgDuration: { $ifNull: [{ $round: ['$avgDuration', 0] }, 0] },
        successRate: {
          $cond: [{ $gt: ['$count', 0] }, { $multiply: [{ $divide: ['$success', '$count'] }, 100] }, 0],
        },
        _id: 0,
      },
    },
  ];

  return DeliveryLog.aggregate(pipeline);
}

async function getDeliveryByBuyer(tenantId, period = '30d') {
  const match = buildMatchStage(tenantId, period);

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: '$buyerId',
        total: { $sum: 1 },
        success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        avgDuration: { $avg: '$duration' },
      },
    },
    { $sort: { total: -1 } },
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
        total: 1,
        success: 1,
        failed: 1,
        avgDuration: { $ifNull: [{ $round: ['$avgDuration', 0] }, 0] },
        successRate: {
          $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$success', '$total'] }, 100] }, 0],
        },
        _id: 0,
      },
    },
  ];

  return DeliveryLog.aggregate(pipeline);
}

module.exports = {
  getDeliveryRates,
  getDeliveryByProvider,
  getFailedDeliveries,
  getDeliveryTrend,
  getDeliverySummary,
  getDeliveryTimeDistribution,
  getRetryAnalytics,
  getDeliveryByBuyer,
};
