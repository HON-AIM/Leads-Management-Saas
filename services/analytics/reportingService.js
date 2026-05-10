const Lead = require('../../models/Lead');
const Client = require('../../models/Client');
const DeliveryLog = require('../../models/DeliveryLog');
const AnalyticsCache = require('../../models/AnalyticsCache');

const LOG_PREFIX = '[ReportingService]';

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

async function generateLeadReport(tenantId, period = '30d') {
  const { start, end } = dateRange(period);
  const match = { tenantId, createdAt: { $gte: start, $lte: end } };

  const leads = await Lead.find(match)
    .populate('assignedTo', 'name email state')
    .select('name email phone state source campaign status ingestionStatus deliveryStatus assignedTo createdAt')
    .sort({ createdAt: -1 })
    .lean();

  return leads.map(l => ({
    name: l.name,
    email: l.email,
    phone: l.phone || '',
    state: l.state,
    source: l.source,
    campaign: l.campaign || '',
    status: l.status,
    ingestionStatus: l.ingestionStatus,
    deliveryStatus: l.deliveryStatus,
    assignedBuyer: l.assignedTo?.name || 'Unassigned',
    assignedBuyerEmail: l.assignedTo?.email || '',
    assignedBuyerState: l.assignedTo?.state || '',
    receivedAt: l.createdAt.toISOString(),
  }));
}

async function generateDeliveryReport(tenantId, period = '30d') {
  const { start, end } = dateRange(period);
  const match = { tenantId, createdAt: { $gte: start, $lte: end } };

  const logs = await DeliveryLog.find(match)
    .populate('leadId', 'name email state source')
    .populate('buyerId', 'name email')
    .select('provider attempt status duration error responseCode createdAt deliveredAt')
    .sort({ createdAt: -1 })
    .lean();

  return logs.map(l => ({
    leadName: l.leadId?.name || 'Unknown',
    leadEmail: l.leadId?.email || '',
    leadState: l.leadId?.state || '',
    leadSource: l.leadId?.source || '',
    buyerName: l.buyerId?.name || 'Unknown',
    buyerEmail: l.buyerId?.email || '',
    provider: l.provider,
    attempt: l.attempt,
    status: l.status,
    duration: l.duration || 0,
    error: l.error || '',
    responseCode: l.responseCode || 0,
    attemptedAt: l.createdAt.toISOString(),
    deliveredAt: l.deliveredAt ? l.deliveredAt.toISOString() : '',
  }));
}

async function generateBuyerReport(tenantId, period = '30d') {
  const { start, end } = dateRange(period);
  const match = { tenantId, createdAt: { $gte: start, $lte: end }, assignedTo: { $ne: null } };

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: '$assignedTo',
        leadsReceived: { $sum: 1 },
        delivered: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'failed'] }, 1, 0] } },
        converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
        contacted: { $sum: { $cond: [{ $eq: ['$status', 'contacted'] }, 1, 0] } },
        sources: { $addToSet: '$source' },
        states: { $addToSet: '$state' },
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
        buyerName: '$buyer.name',
        buyerEmail: '$buyer.email',
        buyerState: '$buyer.state',
        routingMode: '$buyer.routingMode',
        leadCap: '$buyer.leadCap',
        leadsTotal: '$buyer.leadsReceived',
        leadsReceived: 1,
        delivered: 1,
        failed: 1,
        converted: 1,
        contacted: 1,
        sourceCount: { $size: '$sources' },
        stateCoverage: { $size: '$states' },
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

async function generateSourceReport(tenantId, period = '30d') {
  const { start, end } = dateRange(period);
  const match = { tenantId, createdAt: { $gte: start, $lte: end } };

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
        assigned: { $sum: { $cond: [{ $ne: ['$assignedTo', null] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'failed'] }, 1, 0] } },
        duplicate: { $sum: { $cond: [{ $eq: ['$ingestionStatus', 'duplicate'] }, 1, 0] } },
        converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
        campaigns: { $addToSet: '$campaign' },
        states: { $addToSet: '$state' },
      },
    },
    { $sort: { count: -1 } },
    {
      $project: {
        source: '$_id',
        count: 1,
        assigned: 1,
        delivered: 1,
        failed: 1,
        duplicate: 1,
        converted: 1,
        campaignCount: { $size: { $ifNull: [{ $filter: { input: '$campaigns', as: 'c', cond: { $and: [{ $ne: ['$$c', null] }, { $ne: ['$$c', ''] }] } } }, []] } },
        stateCoverage: { $size: '$states' },
        assignmentRate: {
          $cond: [{ $gt: ['$count', 0] }, { $multiply: [{ $divide: ['$assigned', '$count'] }, 100] }, 0],
        },
        deliveryRate: {
          $cond: [{ $gt: ['$assigned', 0] }, { $multiply: [{ $divide: ['$delivered', '$assigned'] }, 100] }, 0],
        },
        conversionRate: {
          $cond: [{ $gt: ['$count', 0] }, { $multiply: [{ $divide: ['$converted', '$count'] }, 100] }, 0],
        },
        _id: 0,
      },
    },
  ];

  return Lead.aggregate(pipeline);
}

async function generateCampaignReport(tenantId, period = '30d') {
  const { start, end } = dateRange(period);
  const match = { tenantId, createdAt: { $gte: start, $lte: end }, campaign: { $ne: null, $ne: '' } };

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: '$campaign',
        count: { $sum: 1 },
        assigned: { $sum: { $cond: [{ $ne: ['$assignedTo', null] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'delivered'] }, 1, 0] } },
        converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
        sources: { $addToSet: '$source' },
        states: { $addToSet: '$state' },
        daily: { $push: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
      },
    },
    { $sort: { count: -1 } },
    {
      $project: {
        campaign: '$_id',
        count: 1,
        assigned: 1,
        delivered: 1,
        converted: 1,
        sourceCount: { $size: '$sources' },
        stateCoverage: { $size: '$states' },
        activeDays: { $size: { $reduce: { input: '$daily', initialValue: [], in: { $cond: [{ $in: ['$$this', '$$value'] }, '$$value', { $concatArrays: ['$$value', ['$$this']] }] } } } },
        assignmentRate: {
          $cond: [{ $gt: ['$count', 0] }, { $multiply: [{ $divide: ['$assigned', '$count'] }, 100] }, 0],
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

async function generateSummaryReport(tenantId, period = '30d') {
  const { start, end } = dateRange(period);

  const [leadReport, deliveryReport, buyerReport, sourceReport, campaignReport] = await Promise.all([
    generateLeadReport(tenantId, period),
    generateDeliveryReport(tenantId, period),
    generateBuyerReport(tenantId, period),
    generateSourceReport(tenantId, period),
    generateCampaignReport(tenantId, period),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    period: { start, end },
    summary: {
      totalLeads: leadReport.length,
      totalDeliveries: deliveryReport.length,
      activeBuyers: buyerReport.length,
      sourceCount: sourceReport.length,
      campaignCount: campaignReport.length,
    },
    reports: {
      leads: leadReport,
      deliveries: deliveryReport,
      buyers: buyerReport,
      sources: sourceReport,
      campaigns: campaignReport,
    },
  };
}

function toCSV(headers, rows) {
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const headerLine = headers.join(',');
  const dataLines = rows.map(row => headers.map(h => escape(row[h])).join(','));
  return [headerLine, ...dataLines].join('\r\n');
}

async function exportReportCSV(tenantId, reportType, period = '30d') {
  let data;
  let headers;

  switch (reportType) {
    case 'leads': {
      data = await generateLeadReport(tenantId, period);
      headers = ['name', 'email', 'phone', 'state', 'source', 'campaign', 'status', 'ingestionStatus', 'deliveryStatus', 'assignedBuyer', 'assignedBuyerEmail', 'assignedBuyerState', 'receivedAt'];
      break;
    }
    case 'deliveries': {
      data = await generateDeliveryReport(tenantId, period);
      headers = ['leadName', 'leadEmail', 'leadState', 'leadSource', 'buyerName', 'buyerEmail', 'provider', 'attempt', 'status', 'duration', 'error', 'responseCode', 'attemptedAt', 'deliveredAt'];
      break;
    }
    case 'buyers': {
      data = await generateBuyerReport(tenantId, period);
      headers = ['buyerName', 'buyerEmail', 'buyerState', 'routingMode', 'leadCap', 'leadsTotal', 'leadsReceived', 'delivered', 'failed', 'converted', 'contacted', 'sourceCount', 'stateCoverage', 'deliveryRate', 'conversionRate'];
      break;
    }
    case 'sources': {
      data = await generateSourceReport(tenantId, period);
      headers = ['source', 'count', 'assigned', 'delivered', 'failed', 'duplicate', 'converted', 'campaignCount', 'stateCoverage', 'assignmentRate', 'deliveryRate', 'conversionRate'];
      break;
    }
    case 'campaigns': {
      data = await generateCampaignReport(tenantId, period);
      headers = ['campaign', 'count', 'assigned', 'delivered', 'converted', 'sourceCount', 'stateCoverage', 'activeDays', 'assignmentRate', 'conversionRate'];
      break;
    }
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }

  return {
    csv: toCSV(headers, data),
    filename: `${reportType}-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`,
    count: data.length,
  };
}

module.exports = {
  generateLeadReport,
  generateDeliveryReport,
  generateBuyerReport,
  generateSourceReport,
  generateCampaignReport,
  generateSummaryReport,
  exportReportCSV,
};
