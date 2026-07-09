const Lead = require('../../models/Lead');
const { round2 } = require('../financialService');

function dateRange(period) {
  const now = new Date();
  const end = new Date(now);
  let start = new Date(now);

  switch (period) {
    case '24h':
      start.setHours(start.getHours() - 24);
      break;
    case '7d':
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

function previousRange(period) {
  const { start, end } = dateRange(period);
  const duration = end.getTime() - start.getTime();
  return {
    start: new Date(start.getTime() - duration),
    end: new Date(start.getTime()),
  };
}

function pctChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return round2(((current - previous) / previous) * 100);
}

async function aggregatePeriod(tenantId, start, end) {
  const match = {
    tenantId,
    createdAt: { $gte: start, $lte: end },
    ingestionStatus: { $nin: ['duplicate'] },
  };

  const [totals] = await Lead.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        leads: { $sum: 1 },
        accepted: {
          $sum: {
            $cond: [
              { $and: [{ $ne: ['$assignedTo', null] }, { $eq: ['$financialStatus', 'accepted'] }] },
              1,
              0,
            ],
          },
        },
        returned: { $sum: { $cond: [{ $eq: ['$financialStatus', 'returned'] }, 1, 0] } },
        revenue: { $sum: { $cond: [{ $eq: ['$financialStatus', 'accepted'] }, '$revenue', 0] } },
        cost: { $sum: '$cost' },
        profit: {
          $sum: {
            $cond: [
              { $eq: ['$financialStatus', 'accepted'] },
              { $subtract: ['$revenue', '$cost'] },
              { $multiply: ['$cost', -1] },
            ],
          },
        },
      },
    },
  ]);

  const row = totals || { leads: 0, accepted: 0, returned: 0, revenue: 0, cost: 0, profit: 0 };
  const revenue = round2(row.revenue);
  const cost = round2(row.cost);
  const profit = round2(row.profit);
  const leads = row.leads;
  const accepted = row.accepted;
  const acceptRate = leads > 0 ? round2((accepted / leads) * 100) : 0;
  const cpl = accepted > 0 ? round2(cost / accepted) : 0;
  const profitMargin = revenue > 0 ? round2((profit / revenue) * 100) : 0;
  const roi = cost > 0 ? round2((profit / cost) * 100) : 0;

  return {
    leads,
    accepted,
    returned: row.returned,
    revenue,
    cost,
    profit,
    acceptRate,
    cpl,
    profitMargin,
    roi,
  };
}

async function getFinancialOverview(tenantId, period = '7d') {
  const current = dateRange(period);
  const previous = previousRange(period);

  const [currentStats, previousStats] = await Promise.all([
    aggregatePeriod(tenantId, current.start, current.end),
    aggregatePeriod(tenantId, previous.start, previous.end),
  ]);

  return {
    period,
    current: currentStats,
    previous: previousStats,
    deltas: {
      revenue: pctChange(currentStats.revenue, previousStats.revenue),
      cost: pctChange(currentStats.cost, previousStats.cost),
      profit: pctChange(currentStats.profit, previousStats.profit),
      profitMargin: pctChange(currentStats.profitMargin, previousStats.profitMargin),
      leads: pctChange(currentStats.leads, previousStats.leads),
      acceptRate: pctChange(currentStats.acceptRate, previousStats.acceptRate),
      cpl: pctChange(currentStats.cpl, previousStats.cpl),
      roi: pctChange(currentStats.roi, previousStats.roi),
    },
    dateRange: { start: current.start, end: current.end },
  };
}

async function getDailyPnL(tenantId, period = '7d') {
  const { start, end } = dateRange(period);

  const rows = await Lead.aggregate([
    {
      $match: {
        tenantId,
        createdAt: { $gte: start, $lte: end },
        ingestionStatus: { $nin: ['duplicate'] },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        leads: { $sum: 1 },
        accepted: {
          $sum: {
            $cond: [{ $and: [{ $ne: ['$assignedTo', null] }, { $eq: ['$financialStatus', 'accepted'] }] }, 1, 0],
          },
        },
        revenue: { $sum: { $cond: [{ $eq: ['$financialStatus', 'accepted'] }, '$revenue', 0] } },
        cost: { $sum: '$cost' },
        profit: {
          $sum: {
            $cond: [
              { $eq: ['$financialStatus', 'accepted'] },
              { $subtract: ['$revenue', '$cost'] },
              { $multiply: ['$cost', -1] },
            ],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        date: '$_id',
        leads: 1,
        accepted: 1,
        revenue: { $round: ['$revenue', 2] },
        cost: { $round: ['$cost', 2] },
        profit: { $round: ['$profit', 2] },
        cpl: {
          $cond: [{ $gt: ['$accepted', 0] }, { $round: [{ $divide: ['$cost', '$accepted'] }, 2] }, 0],
        },
        _id: 0,
      },
    },
  ]);

  return rows;
}

function getReportDateFormat(granularity) {
  switch (granularity) {
    case 'monthly': return '%Y-%m';
    case 'weekly': return '%Y-W%V';
    default: return '%Y-%m-%d';
  }
}

async function getFinancialReport(tenantId, period = '30d', granularity = 'weekly') {
  const { start, end } = dateRange(period);
  const dateFormat = getReportDateFormat(granularity);

  const rows = await Lead.aggregate([
    {
      $match: {
        tenantId,
        createdAt: { $gte: start, $lte: end },
        ingestionStatus: { $nin: ['duplicate'] },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
        leads: { $sum: 1 },
        accepted: {
          $sum: {
            $cond: [{ $and: [{ $ne: ['$assignedTo', null] }, { $eq: ['$financialStatus', 'accepted'] }] }, 1, 0],
          },
        },
        revenue: { $sum: { $cond: [{ $eq: ['$financialStatus', 'accepted'] }, '$revenue', 0] } },
        cost: { $sum: '$cost' },
        profit: {
          $sum: {
            $cond: [
              { $eq: ['$financialStatus', 'accepted'] },
              { $subtract: ['$revenue', '$cost'] },
              { $multiply: ['$cost', -1] },
            ],
          },
        },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  return rows.map((r) => {
    const revenue = round2(r.revenue);
    const cost = round2(r.cost);
    const profit = round2(r.profit);
    const accepted = r.accepted;
    const leads = r.leads;
    return {
      period: r._id,
      leads,
      accepted,
      cpl: accepted > 0 ? round2(cost / accepted) : 0,
      acceptRate: leads > 0 ? round2((accepted / leads) * 100) : 0,
      revenue,
      cost,
      profit,
      profitMargin: revenue > 0 ? round2((profit / revenue) * 100) : 0,
      roi: cost > 0 ? round2((profit / cost) * 100) : 0,
    };
  });
}

module.exports = {
  getFinancialOverview,
  getDailyPnL,
  getFinancialReport,
  aggregatePeriod,
};
