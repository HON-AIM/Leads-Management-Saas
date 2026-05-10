const Lead = require('../../models/Lead');

const LOG_PREFIX = '[LeadAnalytics]';

function dateRange(period) {
  const now = new Date();
  const start = new Date(now);

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    case '7d':
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    case '30d':
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    case '90d':
      start.setDate(start.getDate() - 90);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    default:
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
  }
}

function buildMatchStage(tenantId, period) {
  const { start, end } = dateRange(period);
  return {
    tenantId: tenantId,
    createdAt: { $gte: start, $lte: end },
  };
}

async function getLeadVolume(tenantId, period = '30d') {
  const match = buildMatchStage(tenantId, period);

  const [total, byStatus, byIngestionStatus, byDeliveryStatus] = await Promise.all([
    Lead.countDocuments(match),
    Lead.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Lead.aggregate([
      { $match: match },
      { $group: { _id: '$ingestionStatus', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Lead.aggregate([
      { $match: match },
      { $group: { _id: '$deliveryStatus', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  return { total, byStatus, byIngestionStatus, byDeliveryStatus };
}

async function getSourcePerformance(tenantId, period = '30d') {
  const match = buildMatchStage(tenantId, period);

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
        assigned: { $sum: { $cond: [{ $ne: ['$assignedTo', null] }, 1, 0] } },
        unassigned: { $sum: { $cond: [{ $eq: ['$assignedTo', null] }, 1, 0] } },
        duplicate: { $sum: { $cond: [{ $eq: ['$ingestionStatus', 'duplicate'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$ingestionStatus', 'failed'] }, 1, 0] } },
      },
    },
    { $sort: { count: -1 } },
    {
      $project: {
        source: '$_id',
        count: 1,
        assigned: 1,
        unassigned: 1,
        duplicate: 1,
        failed: 1,
        assignmentRate: {
          $cond: [{ $gt: ['$count', 0] }, { $multiply: [{ $divide: ['$assigned', '$count'] }, 100] }, 0],
        },
      },
    },
  ];

  return Lead.aggregate(pipeline);
}

async function getCampaignMetrics(tenantId, period = '30d') {
  const match = buildMatchStage(tenantId, period);
  match.campaign = { $ne: null, $ne: '' };

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: '$campaign',
        count: { $sum: 1 },
        assigned: { $sum: { $cond: [{ $ne: ['$assignedTo', null] }, 1, 0] } },
        states: { $addToSet: '$state' },
        sources: { $addToSet: '$source' },
      },
    },
    { $sort: { count: -1 } },
    {
      $project: {
        campaign: '$_id',
        count: 1,
        assigned: 1,
        assignmentRate: {
          $cond: [{ $gt: ['$count', 0] }, { $multiply: [{ $divide: ['$assigned', '$count'] }, 100] }, 0],
        },
        stateCoverage: { $size: '$states' },
        sourceCount: { $size: '$sources' },
      },
    },
  ];

  return Lead.aggregate(pipeline);
}

async function getStateDistribution(tenantId, period = '30d') {
  const match = buildMatchStage(tenantId, period);

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: '$state',
        count: { $sum: 1 },
        assigned: { $sum: { $cond: [{ $ne: ['$assignedTo', null] }, 1, 0] } },
      },
    },
    { $sort: { count: -1 } },
    {
      $project: {
        state: '$_id',
        count: 1,
        assigned: 1,
        assignmentRate: {
          $cond: [{ $gt: ['$count', 0] }, { $multiply: [{ $divide: ['$assigned', '$count'] }, 100] }, 0],
        },
      },
    },
  ];

  return Lead.aggregate(pipeline);
}

async function getHourlyDistribution(tenantId, period = '7d') {
  const match = buildMatchStage(tenantId, period);

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: { $hour: '$createdAt' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        hour: '$_id',
        count: 1,
        _id: 0,
      },
    },
  ];

  return Lead.aggregate(pipeline);
}

async function getDuplicateRate(tenantId, period = '30d') {
  const match = buildMatchStage(tenantId, period);

  const [total, duplicates] = await Promise.all([
    Lead.countDocuments(match),
    Lead.countDocuments({ ...match, ingestionStatus: 'duplicate' }),
  ]);

  return {
    total,
    duplicates,
    duplicateRate: total > 0 ? parseFloat(((duplicates / total) * 100).toFixed(2)) : 0,
  };
}

async function getLeadSummary(tenantId, period = '30d') {
  const { start, end } = dateRange(period);

  const [volume, sourcePerf, stateDist, dupRate] = await Promise.all([
    getLeadVolume(tenantId, period),
    getSourcePerformance(tenantId, period),
    getStateDistribution(tenantId, period),
    getDuplicateRate(tenantId, period),
  ]);

  const totalAssigned = volume.byStatus.find(s => s._id === 'assigned');
  const totalConverted = volume.byStatus.find(s => s._id === 'converted');

  return {
    period: { start, end },
    volume,
    sourcePerformance: sourcePerf,
    stateDistribution: stateDist,
    duplicateRate: dupRate,
    conversionRate: totalAssigned?.count > 0
      ? parseFloat((((totalConverted?.count || 0) / totalAssigned.count) * 100).toFixed(2))
      : 0,
  };
}

async function getConversionFunnel(tenantId, period = '30d') {
  const match = buildMatchStage(tenantId, period);

  const pipeline = [
    { $match: match },
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

async function getPeriodComparison(tenantId, currentPeriod = '30d') {
  const now = new Date();
  const { start: currentStart, end: currentEnd } = dateRange(currentPeriod);
  const periodDuration = currentEnd.getTime() - currentStart.getTime();
  const previousStart = new Date(currentStart.getTime() - periodDuration);
  const previousEnd = new Date(currentStart.getTime());

  const currentMatch = { tenantId, createdAt: { $gte: currentStart, $lte: currentEnd } };
  const previousMatch = { tenantId, createdAt: { $gte: previousStart, $lte: previousEnd } };

  const [currentTotal, previousTotal, currentBySource, previousBySource] = await Promise.all([
    Lead.countDocuments(currentMatch),
    Lead.countDocuments(previousMatch),
    Lead.aggregate([
      { $match: currentMatch },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Lead.aggregate([
      { $match: previousMatch },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const change = previousTotal > 0 ? parseFloat((((currentTotal - previousTotal) / previousTotal) * 100).toFixed(2)) : 0;

  const sourceChange = currentBySource.map(cs => {
    const prev = previousBySource.find(ps => ps._id === cs._id);
    const prevCount = prev?.count || 0;
    return {
      source: cs._id,
      current: cs.count,
      previous: prevCount,
      change: prevCount > 0 ? parseFloat((((cs.count - prevCount) / prevCount) * 100).toFixed(2)) : 100,
    };
  });

  return {
    current: { start: currentStart, end: currentEnd, total: currentTotal, bySource: currentBySource },
    previous: { start: previousStart, end: previousEnd, total: previousTotal, bySource: previousBySource },
    change: { total: change, sourceChange },
  };
}

async function getDailyStats(tenantId, days = 30) {
  const match = buildMatchStage(tenantId, `${days}d`);

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: 1 },
        assigned: { $sum: { $cond: [{ $ne: ['$assignedTo', null] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'delivered'] }, 1, 0] } },
        converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
        failedIngestion: { $sum: { $cond: [{ $eq: ['$ingestionStatus', 'failed'] }, 1, 0] } },
        duplicate: { $sum: { $cond: [{ $eq: ['$ingestionStatus', 'duplicate'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        date: '$_id',
        total: 1,
        assigned: 1,
        delivered: 1,
        converted: 1,
        failedIngestion: 1,
        duplicate: 1,
        assignmentRate: {
          $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$assigned', '$total'] }, 100] }, 0],
        },
        _id: 0,
      },
    },
  ];

  return Lead.aggregate(pipeline);
}

async function getWeeklyStats(tenantId, weeks = 12) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - weeks * 7);
  start.setHours(0, 0, 0, 0);

  const pipeline = [
    { $match: { tenantId, createdAt: { $gte: start, $lte: now } } },
    {
      $group: {
        _id: { $dateToString: { format: '%G-W%V', date: '$createdAt' } },
        total: { $sum: 1 },
        assigned: { $sum: { $cond: [{ $ne: ['$assignedTo', null] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'delivered'] }, 1, 0] } },
        converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        week: '$_id',
        total: 1,
        assigned: 1,
        delivered: 1,
        converted: 1,
        assignmentRate: {
          $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$assigned', '$total'] }, 100] }, 0],
        },
        conversionRate: {
          $cond: [{ $gt: ['$assigned', 0] }, { $multiply: [{ $divide: ['$converted', '$assigned'] }, 100] }, 0],
        },
        _id: 0,
      },
    },
  ];

  return Lead.aggregate(pipeline);
}

async function getMonthlyStats(tenantId, months = 12) {
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - months);
  start.setHours(0, 0, 0, 0);

  const pipeline = [
    { $match: { tenantId, createdAt: { $gte: start, $lte: now } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        total: { $sum: 1 },
        assigned: { $sum: { $cond: [{ $ne: ['$assignedTo', null] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'delivered'] }, 1, 0] } },
        converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        month: '$_id',
        total: 1,
        assigned: 1,
        delivered: 1,
        converted: 1,
        assignmentRate: {
          $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$assigned', '$total'] }, 100] }, 0],
        },
        conversionRate: {
          $cond: [{ $gt: ['$assigned', 0] }, { $multiply: [{ $divide: ['$converted', '$assigned'] }, 100] }, 0],
        },
        _id: 0,
      },
    },
  ];

  return Lead.aggregate(pipeline);
}

module.exports = {
  getLeadVolume,
  getSourcePerformance,
  getCampaignMetrics,
  getStateDistribution,
  getHourlyDistribution,
  getDuplicateRate,
  getLeadSummary,
  getConversionFunnel,
  getPeriodComparison,
  getDailyStats,
  getWeeklyStats,
  getMonthlyStats,
};
