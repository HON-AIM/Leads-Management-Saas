const express = require('express');
const { authenticate, requirePermission, tenantIsolation } = require('../middleware/auth');
const OwnershipService = require('../src/services/ownership/ownershipService');
const routingHistoryService = require('../src/services/ownership/routingHistoryService');
const CrmSyncService = require('../src/services/ownership/crmSyncService');
const ReassignmentService = require('../src/services/ownership/reassignmentService');
const AssignmentAuditService = require('../src/services/ownership/assignmentAuditService');
const Lead = require('../models/Lead');
const Client = require('../models/Client');

const router = express.Router();

router.get('/leads/:id/history', authenticate, tenantIsolation, requirePermission('leads', 'read'), async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, tenantId: req.tenantId }).select('_id');
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

    const history = await routingHistoryService.getLeadHistory(req.params.id, {
      limit: parseInt(req.query.limit) || 50,
      skip: parseInt(req.query.skip) || 0,
    });

    const summary = await routingHistoryService.getLeadRoutingSummary(req.params.id);

    res.json({ success: true, history, summary });
  } catch (err) {
    console.error('[OWNERSHIP_HISTORY_ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/leads/:id/ownership', authenticate, tenantIsolation, requirePermission('leads', 'read'), async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, tenantId: req.tenantId }).select('_id');
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

    const ownership = await OwnershipService.getOwnership(req.params.id);
    const audit = await AssignmentAuditService.getAuditTrail(req.params.id, { limit: 20 });

    res.json({ success: true, ownership, audit });
  } catch (err) {
    console.error('[OWNERSHIP_GET_ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/leads/:id/reassign', authenticate, tenantIsolation, requirePermission('leads', 'update'), async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, tenantId: req.tenantId }).select('_id');
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

    const { buyerId, reason, ghlApiKey, webhookUrl, syncPlatform } = req.body;
    if (!buyerId) return res.status(400).json({ success: false, error: 'buyerId is required' });

    const buyer = await Client.findOne({ _id: buyerId, tenantId: req.tenantId, status: { $ne: 'inactive' } });
    if (!buyer) return res.status(404).json({ success: false, error: 'Buyer not found or inactive' });

    const crmConfig = syncPlatform ? { platform: syncPlatform, ghlApiKey, webhookUrl } : null;

    const result = await ReassignmentService.reassignLead(req.params.id, buyer, {
      tenantId: req.tenantId,
      reason: reason || 'Manual reassignment',
      performedBy: req.user?.username || 'system',
      performedByUserId: req.user?._id,
      crmConfig,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[REASSIGN_ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/leads/:id/lock', authenticate, tenantIsolation, requirePermission('leads', 'update'), async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, tenantId: req.tenantId }).select('_id');
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

    const result = await OwnershipService.lockOwnership(req.params.id, {
      tenantId: req.tenantId,
      performedBy: req.user?.username || 'system',
      performedByUserId: req.user?._id,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[LOCK_OWNERSHIP_ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/leads/:id/unlock', authenticate, tenantIsolation, requirePermission('leads', 'update'), async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, tenantId: req.tenantId }).select('_id');
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

    const result = await OwnershipService.unlockOwnership(req.params.id, {
      tenantId: req.tenantId,
      performedBy: req.user?.username || 'system',
      performedByUserId: req.user?._id,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[UNLOCK_OWNERSHIP_ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/sync/logs', authenticate, tenantIsolation, requirePermission('leads', 'read'), async (req, res) => {
  try {
    const { leadId, platform, limit = 50 } = req.query;
    const filter = { tenantId: req.tenantId };

    if (leadId) {
      const lead = await Lead.findOne({ _id: leadId, tenantId: req.tenantId }).select('_id');
      if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
      filter.leadId = leadId;
    }
    if (platform) filter.platform = platform;

    const logs = await require('../models/CrmSyncLog').find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('leadId', 'name email')
      .lean();

    res.json({ success: true, logs });
  } catch (err) {
    console.error('[SYNC_LOGS_ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/sync/retry/:logId', authenticate, tenantIsolation, requirePermission('leads', 'update'), async (req, res) => {
  try {
    const CrmSyncLog = require('../models/CrmSyncLog');
    const log = await CrmSyncLog.findOne({ _id: req.params.logId, tenantId: req.tenantId });
    if (!log) return res.status(404).json({ success: false, error: 'Sync log not found' });

    const result = await CrmSyncService.retryFailedSync(req.params.logId);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[SYNC_RETRY_ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/audit/ownership', authenticate, tenantIsolation, requirePermission('analytics', 'read'), async (req, res) => {
  try {
    const { eventType, limit = 50, skip = 0, startDate, endDate, buyerId } = req.query;

    if (buyerId) {
      const audit = await AssignmentAuditService.getRecentByBuyer(buyerId, req.tenantId, { limit: parseInt(limit) });
      return res.json({ success: true, audit });
    }

    const audit = await AssignmentAuditService.getOwnershipAudit(req.tenantId, {
      eventType,
      limit: parseInt(limit),
      skip: parseInt(skip),
      startDate,
      endDate,
    });

    res.json({ success: true, audit });
  } catch (err) {
    console.error('[AUDIT_ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/audit/lead/:leadId', authenticate, tenantIsolation, requirePermission('leads', 'read'), async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.leadId, tenantId: req.tenantId }).select('_id');
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

    const audit = await AssignmentAuditService.getAuditTrail(req.params.leadId, {
      limit: parseInt(req.query.limit) || 50,
      skip: parseInt(req.query.skip) || 0,
    });

    res.json({ success: true, audit });
  } catch (err) {
    console.error('[LEAD_AUDIT_ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
