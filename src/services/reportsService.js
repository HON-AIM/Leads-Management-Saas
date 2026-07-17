const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const LeadAssignment = require('../models/LeadAssignment');
const DeliveryAttempt = require('../models/DeliveryAttempt');
const Campaign = require('../models/Campaign');
const Buyer = require('../models/Buyer');

function tid(tenantId) {
  return typeof tenantId === 'string'
    ? mongoose.Types.ObjectId.createFromHexString(tenantId)
    : tenantId;
}

async function getOverview(tenantId) {
  const t = tid(tenantId);

  const [leadCounts, assignmentCounts, dupeCount, deliveryTimes] = await Promise.all([
    Lead.aggregate([
      { $match: { tenantId: t } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    LeadAssignment.aggregate([
      { $match: { tenantId: t } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$revenue' },
          cost: { $sum: '$cost' },
        },
      },
    ]),
    Lead.countDocuments({ tenantId: t, isDuplicate: true }),
    DeliveryAttempt.aggregate([
      { $match: { tenantId: t, success: true, durationMs: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$durationMs' }, count: { $sum: 1 } } },
    ]),
  ]);

  const leadsByStatus = {};
  for (const s of leadCounts) leadsByStatus[s._id] = s.count;

  const assignmentsByStatus = {};
  for (const s of assignmentCounts) assignmentsByStatus[s._id] = s;

  const totalLeads = Object.values(leadsByStatus).reduce((a, b) => a + b, 0);
  const totalAssignments = Object.values(assignmentsByStatus).reduce((a, b) => a + (b.count || 0), 0);
  const delivered = assignmentsByStatus.delivered?.count || 0;
  const failed = assignmentsByStatus.failed?.count || 0;
  const returned = assignmentsByStatus.returned?.count || 0;
  const pending = assignmentsByStatus.pending?.count || 0;

  const successRate = totalAssignments > 0 ? ((delivered / totalAssignments) * 100) : 0;
  const duplicateRate = totalLeads > 0 ? ((dupeCount / totalLeads) * 100) : 0;
  const avgDeliveryMs = deliveryTimes[0]?.avg || 0;

  return {
    totalLeads,
    totalAssignments,
    delivered,
    failed,
    returned,
    pending,
    dupeCount,
    successRate: Math.round(successRate * 10) / 10,
    duplicateRate: Math.round(duplicateRate * 10) / 10,
    avgDeliveryMs: Math.round(avgDeliveryMs),
    revenue: (assignmentsByStatus.delivered?.revenue || 0) + (assignmentsByStatus.returned?.revenue || 0),
    cost: (assignmentsByStatus.delivered?.cost || 0) + (assignmentsByStatus.returned?.cost || 0),
  };
}

async function getLeadVolume(tenantId, days = 30) {
  const t = tid(tenantId);
  const since = new Date(Date.now() - days * 86400000);

  const [byDay, byStatus] = await Promise.all([
    Lead.aggregate([
      { $match: { tenantId: t, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Lead.aggregate([
      { $match: { tenantId: t, createdAt: { $gte: since } } },
      { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, status: '$status' }, count: { $sum: 1 } } },
      { $sort: { '_id.date': 1 } },
    ]),
  ]);

  const statusMap = {};
  for (const row of byStatus) {
    if (!statusMap[row._id.date]) statusMap[row._id.date] = {};
    statusMap[row._id.date][row._id.status] = row.count;
  }

  const merged = byDay.map((d) => ({
    date: d._id,
    total: d.count,
    new: statusMap[d._id]?.new || 0,
    delivered: statusMap[d._id]?.delivered || 0,
    failed: statusMap[d._id]?.failed || 0,
  }));

  return merged;
}

async function getBuyerDistribution(tenantId) {
  const t = tid(tenantId);
  return LeadAssignment.aggregate([
    { $match: { tenantId: t } },
    {
      $group: {
        _id: '$buyerId',
        total: { $sum: 1 },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        revenue: { $sum: '$revenue' },
        cost: { $sum: '$cost' },
      },
    },
    { $lookup: { from: 'buyers', localField: '_id', foreignField: '_id', as: 'buyer' } },
    { $unwind: { path: '$buyer', preserveNullAndEmptyArrays: true } },
    { $project: { name: '$buyer.name', total: 1, delivered: 1, failed: 1, revenue: 1, cost: 1 } },
    { $sort: { total: -1 } },
  ]);
}

async function getCampaignPerformance(tenantId) {
  const t = tid(tenantId);
  return LeadAssignment.aggregate([
    { $match: { tenantId: t } },
    {
      $group: {
        _id: '$campaignId',
        total: { $sum: 1 },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        revenue: { $sum: '$revenue' },
        cost: { $sum: '$cost' },
      },
    },
    { $lookup: { from: 'campaigns', localField: '_id', foreignField: '_id', as: 'campaign' } },
    { $unwind: { path: '$campaign', preserveNullAndEmptyArrays: true } },
    { $project: {
      name: '$campaign.name',
      routingMode: '$campaign.routingMode',
      total: 1,
      delivered: 1,
      failed: 1,
      revenue: 1,
      cost: 1,
      successRate: { $cond: [{ $eq: ['$total', 0] }, 0, { $round: [{ $multiply: [{ $divide: ['$delivered', '$total'] }, 100] }, 1] }] },
    } },
    { $sort: { total: -1 } },
  ]);
}

async function getTopBuyers(tenantId, limit = 10) {
  const t = tid(tenantId);

  const buyerStats = await LeadAssignment.aggregate([
    { $match: { tenantId: t } },
    {
      $group: {
        _id: '$buyerId',
        total: { $sum: 1 },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        revenue: { $sum: '$revenue' },
        cost: { $sum: '$cost' },
      },
    },
    { $lookup: { from: 'buyers', localField: '_id', foreignField: '_id', as: 'buyer' } },
    { $unwind: { path: '$buyer', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'deliveryattempts',
        let: { buyerId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$buyerId', '$$buyerId'] }, tenantId: t, success: true, durationMs: { $gt: 0 } } },
          { $group: { _id: null, avgMs: { $avg: '$durationMs' } } },
        ],
        as: 'deliveryStats',
      },
    },
    {
      $project: {
        name: '$buyer.name',
        total: 1,
        delivered: 1,
        failed: 1,
        revenue: 1,
        cost: 1,
        avgDeliveryMs: { $ifNull: [{ $arrayElemAt: ['$deliveryStats.avgMs', 0] }, 0] },
        successRate: { $cond: [{ $eq: ['$total', 0] }, 0, { $round: [{ $multiply: [{ $divide: ['$delivered', '$total'] }, 100] }, 1] }] },
      },
    },
    { $sort: { delivered: -1 } },
    { $limit: limit },
  ]);

  return buyerStats;
}

module.exports = {
  getOverview,
  getLeadVolume,
  getBuyerDistribution,
  getCampaignPerformance,
  getTopBuyers,
};
