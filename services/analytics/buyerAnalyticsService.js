const Lead = require('../../models/Lead');
const Client = require('../../models/Client');
const DeliveryLog = require('../../models/DeliveryLog');

const LOG_PREFIX = '[BuyerAnalytics]';

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

function buildLeadMatch(tenantId, period) {
  const { start, end } = dateRange(period);
  return { tenantId, createdAt: { $gte: start, $lte: end }, assignedTo: { $ne: null } };
}

async function getBuyerPerformance(tenantId, period = '30d') {
  const leadMatch = buildLeadMatch(tenantId, period);

  const pipeline = [
    { $match: leadMatch },
    {
      $group: {
        _id: '$assignedTo',
        leadsReceived: { $sum: 1 },
        delivered: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'failed'] }, 1, 0] } },
        converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
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
        buyerEmail: '$buyer.email',
        buyerState: '$buyer.state',
        buyerStatus: '$buyer.status',
        leadCap: '$buyer.leadCap',
        leadsReceived: 1,
        leadsTotal: '$buyer.leadsReceived',
        dailyCap: '$buyer.dailyCap',
        dailyLeads: '$buyer.dailyLeadsReceived',
        monthlyCap: '$buyer.monthlyCap',
        monthlyLeads: '$buyer.monthlyLeadsReceived',
        isPaused: '$buyer.isPaused',
        routingMode: '$buyer.routingMode',
        delivered: 1,
        failed: 1,
        converted: 1,
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

  return Lead.aggregate(pipeline);
}

async function getBuyerRoutingDistribution(tenantId, period = '30d') {
  const leadMatch = buildLeadMatch(tenantId, period);

  const pipeline = [
    { $match: leadMatch },
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
        source: '$_id.source',
        count: 1,
        _id: 0,
      },
    },
  ];

  return Lead.aggregate(pipeline);
}

async function getBuyerCapUtilization(tenantId) {
  const buyers = await Client.find({ tenantId })
    .select('name state status leadCap leadsReceived dailyCap dailyLeadsReceived monthlyCap monthlyLeadsReceived isPaused')
    .sort({ leadsReceived: -1 });

  return buyers.map(b => ({
    buyerId: b._id,
    name: b.name,
    state: b.state,
    status: b.status,
    isPaused: b.isPaused,
    lifetime: {
      cap: b.leadCap,
      used: b.leadsReceived,
      utilization: b.leadCap > 0 ? parseFloat(((b.leadsReceived / b.leadCap) * 100).toFixed(1)) : 0,
    },
    daily: {
      cap: b.dailyCap,
      used: b.dailyLeadsReceived,
      utilization: b.dailyCap > 0 ? parseFloat(((b.dailyLeadsReceived / b.dailyCap) * 100).toFixed(1)) : 0,
    },
    monthly: {
      cap: b.monthlyCap,
      used: b.monthlyLeadsReceived,
      utilization: b.monthlyCap > 0 ? parseFloat(((b.monthlyLeadsReceived / b.monthlyCap) * 100).toFixed(1)) : 0,
    },
  }));
}

async function getTopBuyers(tenantId, period = '30d', limit = 10) {
  const leadMatch = buildLeadMatch(tenantId, period);

  const pipeline = [
    { $match: leadMatch },
    {
      $group: {
        _id: '$assignedTo',
        leadsReceived: { $sum: 1 },
        delivered: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'delivered'] }, 1, 0] } },
      },
    },
    { $sort: { leadsReceived: -1 } },
    { $limit: limit },
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
        leadsReceived: 1,
        delivered: 1,
        deliveryRate: {
          $cond: [{ $gt: ['$leadsReceived', 0] }, { $multiply: [{ $divide: ['$delivered', '$leadsReceived'] }, 100] }, 0],
        },
      },
    },
  ];

  return Lead.aggregate(pipeline);
}

async function getBuyerSummary(tenantId, period = '30d') {
  const { start, end } = dateRange(period);

  const [performance, capUtilization, topBuyers] = await Promise.all([
    getBuyerPerformance(tenantId, period),
    getBuyerCapUtilization(tenantId),
    getTopBuyers(tenantId, period),
  ]);

  const totalBuyers = await Client.countDocuments({ tenantId, status: { $ne: 'inactive' } });
  const activeBuyers = await Client.countDocuments({ tenantId, status: 'active', isPaused: false });
  const pausedBuyers = await Client.countDocuments({ tenantId, isPaused: true });
  const fullBuyers = await Client.countDocuments({ tenantId, status: 'full' });

  return {
    period: { start, end },
    buyerStats: { totalBuyers, activeBuyers, pausedBuyers, fullBuyers },
    performance,
    capUtilization,
    topBuyers,
  };
}

async function getBuyerPerformanceTrend(tenantId, buyerId, granularity = 'daily') {
  const now = new Date();
  const start = new Date(now);

  switch (granularity) {
    case 'daily': start.setDate(start.getDate() - 30); break;
    case 'weekly': start.setDate(start.getDate() - 90); break;
    case 'monthly': start.setMonth(start.getMonth() - 12); break;
    default: start.setDate(start.getDate() - 30);
  }
  start.setHours(0, 0, 0, 0);

  const dateFormat = (() => {
    switch (granularity) {
      case 'daily': return '%Y-%m-%d';
      case 'weekly': return '%Y-W%V';
      case 'monthly': return '%Y-%m';
      default: return '%Y-%m-%d';
    }
  })();

  const pipeline = [
    { $match: { tenantId, assignedTo: buyerId, createdAt: { $gte: start, $lte: now } } },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
        leadsReceived: { $sum: 1 },
        delivered: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'failed'] }, 1, 0] } },
        converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        period: '$_id',
        leadsReceived: 1,
        delivered: 1,
        failed: 1,
        converted: 1,
        deliveryRate: {
          $cond: [{ $gt: ['$leadsReceived', 0] }, { $multiply: [{ $divide: ['$delivered', '$leadsReceived'] }, 100] }, 0],
        },
        conversionRate: {
          $cond: [{ $gt: ['$leadsReceived', 0] }, { $multiply: [{ $divide: ['$converted', '$leadsReceived'] }, 100] }, 0],
        },
        _id: 0,
      },
    },
  ];

  return Lead.aggregate(pipeline);
}

async function getRoutingDistribution(tenantId, period = '30d') {
  const { start, end } = dateRange(period);

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
    byBuyer: Object.values(byBuyer).sort((a, b) => b.total - a.total),
    raw: distribution,
  };
}

module.exports = {
  getBuyerPerformance,
  getBuyerRoutingDistribution,
  getBuyerCapUtilization,
  getTopBuyers,
  getBuyerSummary,
  getBuyerPerformanceTrend,
  getRoutingDistribution,
};
