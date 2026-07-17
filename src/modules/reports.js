const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const reportsService = require('../services/reportsService');
const { success, error } = require('../utils/response');

router.use(authenticate);

router.get('/overview', async (req, res) => {
  try {
    const data = await reportsService.getOverview(req.tenantId);
    return success(res, data);
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/lead-volume', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await reportsService.getLeadVolume(req.tenantId, days);
    return success(res, data);
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/buyer-distribution', async (req, res) => {
  try {
    const data = await reportsService.getBuyerDistribution(req.tenantId);
    return success(res, data);
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/campaign-performance', async (req, res) => {
  try {
    const data = await reportsService.getCampaignPerformance(req.tenantId);
    return success(res, data);
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/top-buyers', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await reportsService.getTopBuyers(req.tenantId, limit);
    return success(res, data);
  } catch (err) {
    return error(res, err.message);
  }
});

router.get('/export/:view', async (req, res) => {
  try {
    const { view } = req.params;
    let rows = [];
    let filename = 'report';

    switch (view) {
      case 'overview': {
        const data = await reportsService.getOverview(req.tenantId);
        rows = [
          { Metric: 'Total Leads', Value: data.totalLeads },
          { Metric: 'Total Assignments', Value: data.totalAssignments },
          { Metric: 'Delivered', Value: data.delivered },
          { Metric: 'Failed', Value: data.failed },
          { Metric: 'Returned', Value: data.returned },
          { Metric: 'Pending', Value: data.pending },
          { Metric: 'Duplicates', Value: data.dupeCount },
          { Metric: 'Success Rate (%)', Value: data.successRate },
          { Metric: 'Duplicate Rate (%)', Value: data.duplicateRate },
          { Metric: 'Avg Delivery Time (ms)', Value: data.avgDeliveryMs },
          { Metric: 'Revenue', Value: data.revenue },
          { Metric: 'Cost', Value: data.cost },
        ];
        filename = 'overview-report';
        break;
      }
      case 'lead-volume': {
        const days = parseInt(req.query.days) || 30;
        rows = (await reportsService.getLeadVolume(req.tenantId, days)).map((d) => ({
          Date: d.date,
          Total: d.total,
          New: d.new,
          Delivered: d.delivered,
          Failed: d.failed,
        }));
        filename = 'lead-volume-report';
        break;
      }
      case 'buyer-distribution': {
        rows = (await reportsService.getBuyerDistribution(req.tenantId)).map((b) => ({
          Buyer: b.name || 'Unknown',
          Total: b.total,
          Delivered: b.delivered,
          Failed: b.failed,
          Revenue: b.revenue || 0,
          Cost: b.cost || 0,
          'Success Rate (%)': b.total > 0 ? Math.round((b.delivered / b.total) * 1000) / 10 : 0,
        }));
        filename = 'buyer-distribution-report';
        break;
      }
      case 'campaign-performance': {
        rows = (await reportsService.getCampaignPerformance(req.tenantId)).map((c) => ({
          Campaign: c.name || 'Unknown',
          'Routing Mode': c.routingMode || '—',
          Total: c.total,
          Delivered: c.delivered,
          Failed: c.failed,
          'Success Rate (%)': c.successRate,
          Revenue: c.revenue || 0,
          Cost: c.cost || 0,
        }));
        filename = 'campaign-performance-report';
        break;
      }
      case 'top-buyers': {
        rows = (await reportsService.getTopBuyers(req.tenantId)).map((b) => ({
          Buyer: b.name || 'Unknown',
          Total: b.total,
          Delivered: b.delivered,
          Failed: b.failed,
          'Success Rate (%)': b.successRate,
          'Avg Delivery (ms)': Math.round(b.avgDeliveryMs),
          Revenue: b.revenue || 0,
          Cost: b.cost || 0,
        }));
        filename = 'top-buyers-report';
        break;
      }
      default:
        return error(res, `Unknown export view: ${view}`, 400);
    }

    if (rows.length === 0) {
      return error(res, 'No data to export', 404);
    }

    const headers = Object.keys(rows[0]);
    const csvRows = [headers.join(',')];
    for (const row of rows) {
      csvRows.push(headers.map((h) => {
        const val = row[h];
        const str = String(val ?? '');
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(csvRows.join('\n'));
  } catch (err) {
    return error(res, err.message);
  }
});

module.exports = router;
