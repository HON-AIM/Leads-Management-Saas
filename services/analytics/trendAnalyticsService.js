const Lead = require('../../models/Lead');
const DeliveryLog = require('../../models/DeliveryLog');

const LOG_PREFIX = '[TrendAnalytics]';

function buildMatch(tenantId, start, end) {
  return { tenantId, createdAt: { $gte: start, $lte: end } };
}

function getDateRange(granularity) {
  const now = new Date();
  const start = new Date(now);

  switch (granularity) {
    case 'daily':
      start.setDate(start.getDate() - 30);
      break;
    case 'weekly':
      start.setDate(start.getDate() - 90);
      break;
    case 'monthly':
      start.setMonth(start.getMonth() - 12);
      break;
    default:
      start.setDate(start.getDate() - 30);
  }

  start.setHours(0, 0, 0, 0);
  return { start, end: now };
}

function getDateFormat(granularity) {
  switch (granularity) {
    case 'daily': return '%Y-%m-%d';
    case 'weekly': return '%Y-W%V';
    case 'monthly': return '%Y-%m';
    default: return '%Y-%m-%d';
  }
}

async function getLeadTrend(tenantId, granularity = 'daily') {
  const { start, end } = getDateRange(granularity);
  const dateFormat = getDateFormat(granularity);

  const pipeline = [
    { $match: buildMatch(tenantId, start, end) },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
        total: { $sum: 1 },
        assigned: { $sum: { $cond: [{ $ne: ['$assignedTo', null] }, 1, 0] } },
        unassigned: { $sum: { $cond: [{ $eq: ['$assignedTo', null] }, 1, 0] } },
        duplicate: { $sum: { $cond: [{ $eq: ['$ingestionStatus', 'duplicate'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$ingestionStatus', 'failed'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        period: '$_id',
        total: 1,
        assigned: 1,
        unassigned: 1,
        duplicate: 1,
        failed: 1,
        assignmentRate: {
          $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$assigned', '$total'] }, 100] }, 0],
        },
        _id: 0,
      },
    },
  ];

  return Lead.aggregate(pipeline);
}

async function getDeliveryTrend(tenantId, granularity = 'daily') {
  const { start, end } = getDateRange(granularity);
  const dateFormat = getDateFormat(granularity);

  const pipeline = [
    { $match: { tenantId, createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
        total: { $sum: 1 },
        success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        avgDuration: { $avg: '$duration' },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        period: '$_id',
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

async function getLeadVolumeTrend(tenantId, granularity = 'daily') {
  const { start, end } = getDateRange(granularity);
  const dateFormat = getDateFormat(granularity);

  const pipeline = [
    { $match: buildMatch(tenantId, start, end) },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        period: '$_id',
        count: 1,
        _id: 0,
      },
    },
  ];

  return Lead.aggregate(pipeline);
}

async function getSourceTrend(tenantId, granularity = 'daily') {
  const { start, end } = getDateRange(granularity);
  const dateFormat = getDateFormat(granularity);

  const pipeline = [
    { $match: buildMatch(tenantId, start, end) },
    {
      $group: {
        _id: {
          period: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          source: '$source',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.period': 1, count: -1 } },
    {
      $project: {
        period: '$_id.period',
        source: '$_id.source',
        count: 1,
        _id: 0,
      },
    },
  ];

  return Lead.aggregate(pipeline);
}

async function getConversionTrend(tenantId, granularity = 'daily') {
  const { start, end } = getDateRange(granularity);
  const dateFormat = getDateFormat(granularity);

  const pipeline = [
    { $match: { ...buildMatch(tenantId, start, end), assignedTo: { $ne: null } } },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$updatedAt' } },
        total: { $sum: 1 },
        converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        period: '$_id',
        total: 1,
        converted: 1,
        conversionRate: {
          $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$converted', '$total'] }, 100] }, 0],
        },
        _id: 0,
      },
    },
  ];

  return Lead.aggregate(pipeline);
}

async function getFullTrendSummary(tenantId, granularity = 'daily') {
  const { start, end } = getDateRange(granularity);

  const [leadTrend, deliveryTrend, sourceTrend, conversionTrend] = await Promise.all([
    getLeadTrend(tenantId, granularity),
    getDeliveryTrend(tenantId, granularity),
    getSourceTrend(tenantId, granularity),
    getConversionTrend(tenantId, granularity),
  ]);

  return {
    granularity,
    period: { start, end },
    leadTrend,
    deliveryTrend,
    sourceTrend,
    conversionTrend,
  };
}

async function getPeriodOverPeriodComparison(tenantId, granularity = 'daily') {
  const { start: periodStart, end: periodEnd } = getDateRange(granularity);
  const periodDuration = periodEnd.getTime() - periodStart.getTime();
  const prevStart = new Date(periodStart.getTime() - periodDuration);
  const prevEnd = new Date(periodStart.getTime());

  const dateFormat = (() => {
    switch (granularity) {
      case 'daily': return '%Y-%m-%d';
      case 'weekly': return '%Y-W%V';
      case 'monthly': return '%Y-%m';
      default: return '%Y-%m-%d';
    }
  })();

  const [currentLead, previousLead, currentDelivery, previousDelivery] = await Promise.all([
    Lead.aggregate([
      { $match: { tenantId, createdAt: { $gte: periodStart, $lte: periodEnd } } },
      { $group: { _id: null, total: { $sum: 1 }, assigned: { $sum: { $cond: [{ $ne: ['$assignedTo', null] }, 1, 0] } }, converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } } } },
    ]),
    Lead.aggregate([
      { $match: { tenantId, createdAt: { $gte: prevStart, $lte: prevEnd } } },
      { $group: { _id: null, total: { $sum: 1 }, assigned: { $sum: { $cond: [{ $ne: ['$assignedTo', null] }, 1, 0] } }, converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } } } },
    ]),
    DeliveryLog.aggregate([
      { $match: { tenantId, createdAt: { $gte: periodStart, $lte: periodEnd } } },
      { $group: { _id: null, total: { $sum: 1 }, success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } } } },
    ]),
    DeliveryLog.aggregate([
      { $match: { tenantId, createdAt: { $gte: prevStart, $lte: prevEnd } } },
      { $group: { _id: null, total: { $sum: 1 }, success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } } } },
    ]),
  ]);

  const cLead = currentLead[0] || { total: 0, assigned: 0, converted: 0 };
  const pLead = previousLead[0] || { total: 0, assigned: 0, converted: 0 };
  const cDel = currentDelivery[0] || { total: 0, success: 0, failed: 0 };
  const pDel = previousDelivery[0] || { total: 0, success: 0, failed: 0 };

  const calcChange = (curr, prev) => prev > 0 ? parseFloat((((curr - prev) / prev) * 100).toFixed(2)) : curr > 0 ? 100 : 0;

  return {
    granularity,
    current: { start: periodStart, end: periodEnd },
    previous: { start: prevStart, end: prevEnd },
    leads: {
      current: { total: cLead.total, assigned: cLead.assigned, converted: cLead.converted },
      previous: { total: pLead.total, assigned: pLead.assigned, converted: pLead.converted },
      changes: {
        total: calcChange(cLead.total, pLead.total),
        assigned: calcChange(cLead.assigned, pLead.assigned),
        converted: calcChange(cLead.converted, pLead.converted),
      },
    },
    deliveries: {
      current: { total: cDel.total, success: cDel.success, failed: cDel.failed },
      previous: { total: pDel.total, success: pDel.success, failed: pDel.failed },
      changes: {
        total: calcChange(cDel.total, pDel.total),
        success: calcChange(cDel.success, pDel.success),
        failed: calcChange(cDel.failed, pDel.failed),
      },
    },
  };
}

async function getMovingAverages(tenantId, granularity = 'daily', window = 7) {
  const { start, end } = getDateRange(granularity);
  const dateFormat = (() => {
    switch (granularity) {
      case 'daily': return '%Y-%m-%d';
      case 'weekly': return '%Y-W%V';
      case 'monthly': return '%Y-%m';
      default: return '%Y-%m-%d';
    }
  })();

  const leadTrend = await Lead.aggregate([
    { $match: { tenantId, createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
        total: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const values = leadTrend.map(t => t.total);
  const movingAverages = values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    return parseFloat((slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(1));
  });

  return leadTrend.map((t, i) => ({
    period: t._id,
    total: t.total,
    movingAvg: movingAverages[i],
  }));
}

module.exports = {
  getLeadTrend,
  getDeliveryTrend,
  getLeadVolumeTrend,
  getSourceTrend,
  getConversionTrend,
  getFullTrendSummary,
  getPeriodOverPeriodComparison,
  getMovingAverages,
};
