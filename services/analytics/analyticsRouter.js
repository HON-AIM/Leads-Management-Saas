const express = require('express');

const Lead = require('../../models/Lead');
const Client = require('../../models/Client');
const DeliveryLog = require('../../models/DeliveryLog');
const Activity = require('../../models/Activity');
const AnalyticsCache = require('../../models/AnalyticsCache');

const leadAnalytics = require('./leadAnalyticsService');
const deliveryAnalytics = require('./deliveryAnalyticsService');
const buyerAnalytics = require('./buyerAnalyticsService');
const trendAnalytics = require('./trendAnalyticsService');
const aggregationService = require('./aggregationService');
const reportingService = require('./reportingService');

const { authenticate, requirePermission, tenantIsolation } = require('../../middleware/auth');

const LOG_PREFIX = '[AnalyticsRouter]';

function log(step, details = {}) {
  const ts = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${ts} | Step: ${step}`, details);
}

const router = express.Router();

const analyticsAuth = [authenticate, tenantIsolation, requirePermission('analytics', 'read')];
const analyticsWrite = [authenticate, tenantIsolation, requirePermission('analytics', 'write')];

// ─── Dashboard ───────────────────────────────────────────────────────────────────

router.get('/dashboard', ...analyticsAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const period = req.query.period || '30d';

    const cacheKey = `dashboard_${period}`;
    const cached = await AnalyticsCache.findOne({ tenantId, type: 'realtime', period: cacheKey });
    if (cached && Date.now() - cached.computedAt < 60000) {
      return res.json({ success: true, ...cached.data, cached: true });
    }

    const [leadSummary, deliverySummary, buyerSummary] = await Promise.all([
      leadAnalytics.getLeadSummary(tenantId, period),
      deliveryAnalytics.getDeliverySummary(tenantId, period),
      buyerAnalytics.getBuyerSummary(tenantId, period),
    ]);

    const result = { leadSummary, deliverySummary, buyerSummary };

    await AnalyticsCache.updateOne(
      { tenantId, type: 'realtime', period: cacheKey },
      { $set: { data: result, computedAt: new Date(), expiresAt: new Date(Date.now() + 60000) } },
      { upsert: true }
    );

    res.json({ success: true, ...result });
  } catch (err) {
    log('DASHBOARD_ERROR', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Lead Analytics ──────────────────────────────────────────────────────────────

router.get('/leads/volume', ...analyticsAuth, async (req, res) => {
  try {
    const result = await leadAnalytics.getLeadVolume(req.tenantId, req.query.period || '30d');
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/leads/sources', ...analyticsAuth, async (req, res) => {
  try {
    const result = await leadAnalytics.getSourcePerformance(req.tenantId, req.query.period || '30d');
    res.json({ success: true, sources: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/leads/campaigns', ...analyticsAuth, async (req, res) => {
  try {
    const result = await leadAnalytics.getCampaignMetrics(req.tenantId, req.query.period || '30d');
    res.json({ success: true, campaigns: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/leads/states', ...analyticsAuth, async (req, res) => {
  try {
    const result = await leadAnalytics.getStateDistribution(req.tenantId, req.query.period || '30d');
    res.json({ success: true, states: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/leads/hourly', ...analyticsAuth, async (req, res) => {
  try {
    const result = await leadAnalytics.getHourlyDistribution(req.tenantId, req.query.period || '7d');
    res.json({ success: true, hourly: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/leads/duplicate-rate', ...analyticsAuth, async (req, res) => {
  try {
    const result = await leadAnalytics.getDuplicateRate(req.tenantId, req.query.period || '30d');
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/leads/conversion-funnel', ...analyticsAuth, async (req, res) => {
  try {
    const result = await leadAnalytics.getConversionFunnel(req.tenantId, req.query.period || '30d');
    res.json({ success: true, funnel: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/leads/period-comparison', ...analyticsAuth, async (req, res) => {
  try {
    const result = await leadAnalytics.getPeriodComparison(req.tenantId, req.query.period || '30d');
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/leads/daily', ...analyticsAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const result = await leadAnalytics.getDailyStats(req.tenantId, days);
    res.json({ success: true, daily: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/leads/weekly', ...analyticsAuth, async (req, res) => {
  try {
    const weeks = parseInt(req.query.weeks) || 12;
    const result = await leadAnalytics.getWeeklyStats(req.tenantId, weeks);
    res.json({ success: true, weekly: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/leads/monthly', ...analyticsAuth, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const result = await leadAnalytics.getMonthlyStats(req.tenantId, months);
    res.json({ success: true, monthly: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Delivery Analytics ──────────────────────────────────────────────────────────

router.get('/delivery/rates', ...analyticsAuth, async (req, res) => {
  try {
    const result = await deliveryAnalytics.getDeliveryRates(req.tenantId, req.query.period || '30d');
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/delivery/by-provider', ...analyticsAuth, async (req, res) => {
  try {
    const result = await deliveryAnalytics.getDeliveryByProvider(req.tenantId, req.query.period || '30d');
    res.json({ success: true, providers: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/delivery/failures', ...analyticsAuth, async (req, res) => {
  try {
    const result = await deliveryAnalytics.getFailedDeliveries(req.tenantId, req.query.period || '30d');
    res.json({ success: true, failures: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/delivery/trend', ...analyticsAuth, async (req, res) => {
  try {
    const result = await deliveryAnalytics.getDeliveryTrend(req.tenantId, req.query.period || '30d');
    res.json({ success: true, trend: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/delivery/time-distribution', ...analyticsAuth, async (req, res) => {
  try {
    const result = await deliveryAnalytics.getDeliveryTimeDistribution(req.tenantId, req.query.period || '30d');
    res.json({ success: true, hourly: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/delivery/retry-analytics', ...analyticsAuth, async (req, res) => {
  try {
    const result = await deliveryAnalytics.getRetryAnalytics(req.tenantId, req.query.period || '30d');
    res.json({ success: true, retries: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/delivery/by-buyer', ...analyticsAuth, async (req, res) => {
  try {
    const result = await deliveryAnalytics.getDeliveryByBuyer(req.tenantId, req.query.period || '30d');
    res.json({ success: true, buyers: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Buyer Analytics ─────────────────────────────────────────────────────────────

router.get('/buyers/performance', ...analyticsAuth, async (req, res) => {
  try {
    const result = await buyerAnalytics.getBuyerPerformance(req.tenantId, req.query.period || '30d');
    res.json({ success: true, buyers: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/buyers/cap-utilization', ...analyticsAuth, async (req, res) => {
  try {
    const result = await buyerAnalytics.getBuyerCapUtilization(req.tenantId);
    res.json({ success: true, buyers: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/buyers/top', ...analyticsAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await buyerAnalytics.getTopBuyers(req.tenantId, req.query.period || '30d', limit);
    res.json({ success: true, buyers: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/buyers/routing-distribution', ...analyticsAuth, async (req, res) => {
  try {
    const result = await buyerAnalytics.getRoutingDistribution(req.tenantId, req.query.period || '30d');
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/buyers/performance-trend', ...analyticsAuth, async (req, res) => {
  try {
    const { buyerId, granularity } = req.query;
    if (!buyerId) return res.status(400).json({ success: false, error: 'buyerId is required' });
    const result = await buyerAnalytics.getBuyerPerformanceTrend(req.tenantId, buyerId, granularity || 'daily');
    res.json({ success: true, trend: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Trend Analytics ─────────────────────────────────────────────────────────────

router.get('/trends/leads', ...analyticsAuth, async (req, res) => {
  try {
    const result = await trendAnalytics.getLeadTrend(req.tenantId, req.query.granularity || 'daily');
    res.json({ success: true, trend: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/trends/delivery', ...analyticsAuth, async (req, res) => {
  try {
    const result = await trendAnalytics.getDeliveryTrend(req.tenantId, req.query.granularity || 'daily');
    res.json({ success: true, trend: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/trends/sources', ...analyticsAuth, async (req, res) => {
  try {
    const result = await trendAnalytics.getSourceTrend(req.tenantId, req.query.granularity || 'daily');
    res.json({ success: true, trend: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/trends/conversion', ...analyticsAuth, async (req, res) => {
  try {
    const result = await trendAnalytics.getConversionTrend(req.tenantId, req.query.granularity || 'daily');
    res.json({ success: true, trend: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/trends/full', ...analyticsAuth, async (req, res) => {
  try {
    const result = await trendAnalytics.getFullTrendSummary(req.tenantId, req.query.granularity || 'daily');
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/trends/period-over-period', ...analyticsAuth, async (req, res) => {
  try {
    const result = await trendAnalytics.getPeriodOverPeriodComparison(req.tenantId, req.query.granularity || 'daily');
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/trends/moving-averages', ...analyticsAuth, async (req, res) => {
  try {
    const window = parseInt(req.query.window) || 7;
    const result = await trendAnalytics.getMovingAverages(req.tenantId, req.query.granularity || 'daily', window);
    res.json({ success: true, movingAverages: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Real-time ───────────────────────────────────────────────────────────────────

router.get('/realtime', ...analyticsAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);

    const [leadsToday, deliveriesToday, failedToday, activeBuyers, pendingDelivery, leadsLastHour] = await Promise.all([
      Lead.countDocuments({ tenantId, createdAt: { $gte: today } }),
      DeliveryLog.countDocuments({ tenantId, createdAt: { $gte: today }, status: 'success' }),
      DeliveryLog.countDocuments({ tenantId, createdAt: { $gte: today }, status: 'failed' }),
      Client.countDocuments({ tenantId, status: 'active', isPaused: false }),
      Lead.countDocuments({ tenantId, deliveryStatus: 'pending', assignedTo: { $ne: null } }),
      Lead.countDocuments({ tenantId, createdAt: { $gte: lastHour } }),
    ]);

    res.json({
      success: true,
      realtime: {
        leadsToday,
        leadsLastHour,
        deliveriesToday,
        failedToday,
        activeBuyers,
        pendingDelivery,
        successRate: (deliveriesToday + failedToday) > 0
          ? parseFloat(((deliveriesToday / (deliveriesToday + failedToday)) * 100).toFixed(1))
          : 100,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Aggregation ─────────────────────────────────────────────────────────────────

router.post('/aggregate/run', ...analyticsWrite, async (req, res) => {
  try {
    const { type } = req.body;
    if (!type || !['daily', 'weekly', 'monthly'].includes(type)) {
      return res.status(400).json({ success: false, error: 'type must be daily, weekly, or monthly' });
    }
    const result = await aggregationService.runAggregation(req.tenantId, type);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/aggregate/stats', ...analyticsAuth, async (req, res) => {
  try {
    const { type, period } = req.query;
    if (!type || !period) {
      return res.status(400).json({ success: false, error: 'type and period are required' });
    }
    const result = await aggregationService.getAggregatedStats(req.tenantId, type, period);
    if (!result) return res.status(404).json({ success: false, error: 'No aggregated data found' });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/aggregate/list', ...analyticsAuth, async (req, res) => {
  try {
    const type = req.query.type || 'daily';
    const result = await aggregationService.listAvailableAggregations(req.tenantId, type);
    res.json({ success: true, aggregations: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Reports ─────────────────────────────────────────────────────────────────────

router.get('/reports/leads', ...analyticsAuth, async (req, res) => {
  try {
    const result = await reportingService.generateLeadReport(req.tenantId, req.query.period || '30d');
    res.json({ success: true, count: result.length, leads: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/reports/deliveries', ...analyticsAuth, async (req, res) => {
  try {
    const result = await reportingService.generateDeliveryReport(req.tenantId, req.query.period || '30d');
    res.json({ success: true, count: result.length, deliveries: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/reports/buyers', ...analyticsAuth, async (req, res) => {
  try {
    const result = await reportingService.generateBuyerReport(req.tenantId, req.query.period || '30d');
    res.json({ success: true, count: result.length, buyers: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/reports/sources', ...analyticsAuth, async (req, res) => {
  try {
    const result = await reportingService.generateSourceReport(req.tenantId, req.query.period || '30d');
    res.json({ success: true, count: result.length, sources: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/reports/campaigns', ...analyticsAuth, async (req, res) => {
  try {
    const result = await reportingService.generateCampaignReport(req.tenantId, req.query.period || '30d');
    res.json({ success: true, count: result.length, campaigns: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/reports/summary', ...analyticsAuth, async (req, res) => {
  try {
    const result = await reportingService.generateSummaryReport(req.tenantId, req.query.period || '30d');
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/reports/export', ...analyticsAuth, async (req, res) => {
  try {
    const { type, period } = req.query;
    if (!type) return res.status(400).json({ success: false, error: 'type is required (leads, deliveries, buyers, sources, campaigns)' });

    const result = await reportingService.exportReportCSV(req.tenantId, type, period || '30d');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
