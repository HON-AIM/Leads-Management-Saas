const Campaign = require('../models/Campaign');
const Buyer = require('../models/Buyer');
const Lead = require('../models/Lead');
const LeadAssignment = require('../models/LeadAssignment');
const RoutingLog = require('../models/RoutingLog');
const User = require('../models/User');
const logger = require('../utils/logger');

class DashboardService {
  async getOverview(tenantId) {
    const tid = typeof tenantId === 'string' ? require('mongoose').Types.ObjectId.createFromHexString(tenantId) : tenantId;

    const [
      totalLeads,
      activeCampaigns,
      activeBuyers,
      totalUsers,
      leadStats,
      assignmentStats,
      recentAssignments,
      todayLeads,
    ] = await Promise.all([
      Lead.countDocuments({ tenantId: tid }),
      Campaign.countDocuments({ tenantId: tid, status: 'active' }),
      Buyer.countDocuments({ tenantId: tid, status: 'active' }),
      User.countDocuments({ tenantId: tid, status: 'active' }),
      Lead.aggregate([
        { $match: { tenantId: tid } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      LeadAssignment.aggregate([
        { $match: { tenantId: tid } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            revenue: { $sum: '$revenue' },
            cost: { $sum: '$cost' },
          },
        },
      ]),
      LeadAssignment.find({ tenantId: tid })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('leadId', 'name email state source createdAt')
        .populate('buyerId', 'name email')
        .lean(),
      Lead.countDocuments({ tenantId: tid, createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
    ]);

    const statusMap = {};
    for (const s of leadStats) statusMap[s._id] = s.count;

    const deliveryStats = {};
    for (const s of assignmentStats) deliveryStats[s._id] = s;

    return {
      totalLeads,
      activeCampaigns,
      activeBuyers,
      totalUsers,
      todayLeads,
      leads: {
        pending: statusMap.pending || 0,
        routed: statusMap.routed || 0,
        delivered: statusMap.delivered || 0,
        failed: statusMap.failed || 0,
        duplicate: statusMap.duplicate || 0,
      },
      delivery: {
        total: (deliveryStats.pending?.count || 0) + (deliveryStats.delivered?.count || 0) + (deliveryStats.failed?.count || 0),
        pending: deliveryStats.pending?.count || 0,
        delivered: deliveryStats.delivered?.count || 0,
        failed: deliveryStats.failed?.count || 0,
        revenue: deliveryStats.delivered?.revenue || 0,
        cost: deliveryStats.delivered?.cost || 0,
      },
      recentAssignments,
    };
  }

  async getCampaignStats(tenantId) {
    const tid = typeof tenantId === 'string' ? require('mongoose').Types.ObjectId.createFromHexString(tenantId) : tenantId;
    return LeadAssignment.aggregate([
      { $match: { tenantId: tid } },
      { $group: { _id: '$campaignId', total: { $sum: 1 }, delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } } } },
      { $lookup: { from: 'campaigns', localField: '_id', foreignField: '_id', as: 'campaign' } },
      { $unwind: { path: '$campaign', preserveNullAndEmptyArrays: true } },
      { $project: { name: '$campaign.name', total: 1, delivered: 1, failed: 1 } },
      { $sort: { total: -1 } },
    ]);
  }

  async getBuyerStats(tenantId) {
    const tid = typeof tenantId === 'string' ? require('mongoose').Types.ObjectId.createFromHexString(tenantId) : tenantId;
    return LeadAssignment.aggregate([
      { $match: { tenantId: tid } },
      { $group: { _id: '$buyerId', total: { $sum: 1 }, delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }, revenue: { $sum: '$revenue' }, cost: { $sum: '$cost' } } },
      { $lookup: { from: 'buyers', localField: '_id', foreignField: '_id', as: 'buyer' } },
      { $unwind: { path: '$buyer', preserveNullAndEmptyArrays: true } },
      { $project: { name: '$buyer.name', email: '$buyer.email', total: 1, delivered: 1, failed: 1, revenue: 1, cost: 1 } },
      { $sort: { total: -1 } },
    ]);
  }

  async getLeadTrend(tenantId, days = 30) {
    const tid = typeof tenantId === 'string' ? require('mongoose').Types.ObjectId.createFromHexString(tenantId) : tenantId;
    const since = new Date(Date.now() - days * 86400000);
    return Lead.aggregate([
      { $match: { tenantId: tid, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
  }
}

module.exports = new DashboardService();
