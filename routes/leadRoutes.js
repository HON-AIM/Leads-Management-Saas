const express = require('express');
const Lead = require('../models/Lead');
const Client = require('../models/Client');
const Activity = require('../models/Activity');
const { authenticate, requirePermission, tenantIsolation } = require('../middleware/auth');
const { optionalTenant } = require('../middleware/tenant');
const { ingestBodySchema, flexibleIngestSchema, detectSource, extractFromSource } = require('../validation/ingestionSchema');
const { ingestLead } = require('../services/ingestionService');
const { pushToQueue } = require('../queue/ingestionQueue');
const { routeLead } = require('../services/routingService');
const { normalizeState } = require('../services/ingestionService');
const { sendLeadAssignedEmail } = require('../services/emailService');

const LOG_PREFIX = '[LeadRoutes]';

function log(step, result, details = {}) {
  const ts = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${ts} | Step: ${step} | Result: ${result}`, details);
}

const router = express.Router();

router.post('/ingest', async (req, res) => {
  try {
    log('RECEIVED', 'OK', { contentType: req.headers['content-type'], ip: req.ip });

    const detectedSource = detectSource(req.body);
    let body;
    let sourceApplied = detectedSource;

    if (detectedSource) {
      const extracted = extractFromSource(req.body, detectedSource);
      body = { ...req.body, ...extracted, source: extracted.source || detectedSource };
      log('SOURCE_DETECTED', detectedSource.toUpperCase(), { extracted });
    } else {
      const parseResult = ingestBodySchema.safeParse(req.body);
      if (parseResult.success) {
        body = parseResult.data;
        log('VALIDATION', 'STRICT_OK', { source: body.source });
      } else {
        const flexibleResult = flexibleIngestSchema.safeParse(req.body);
        if (!flexibleResult.success) {
          log('VALIDATION', 'FAILED', { errors: flexibleResult.error.issues });
          return res.status(400).json({
            success: false,
            error: 'Invalid payload',
            details: flexibleResult.error.issues,
          });
        }
        body = flexibleResult.data;
        log('VALIDATION', 'FLEXIBLE_OK', {});
      }
    }

    const tenantId = req.tenantId
      || req.tenant?._id
      || body.tenantId
      || (req.user?.tenantId?._id);

    if (!tenantId) {
      log('TENANT', 'MISSING', {});
      return res.status(400).json({ success: false, error: 'Tenant context required' });
    }

    const dedupWindowHours = parseInt(req.query.dedupWindow) || parseInt(req.headers['x-dedup-window']) || 24;

    const result = await ingestLead(body, tenantId, { dedupWindowHours });

    if (!result.success) {
      return res.status(result.statusCode).json({ success: false, error: result.error });
    }

    let queueResult = null;
    if (!result.duplicate) {
      try {
        queueResult = await pushToQueue(result.lead);
        result.lead.ingestionStatus = 'queued';
        await result.lead.save();
        log('QUEUED', 'OK', { leadId: result.lead._id, queueJobId: queueResult.id });
      } catch (queueErr) {
        log('QUEUE_ERROR', 'FAILED', { error: queueErr.message });
      }
    }

    res.status(result.statusCode).json({
      success: true,
      leadId: result.lead._id,
      ingestionStatus: result.lead.ingestionStatus,
      source: result.lead.source,
      campaign: result.lead.campaign,
      duplicate: result.duplicate,
      duplicateOf: result.duplicateOf,
      duplicateReason: result.duplicateReason,
      queued: !!queueResult,
      metadata: {
        receivedAt: result.lead.createdAt,
        normalizedState: result.lead.state,
        tracking: result.lead.trackingMetadata,
      },
    });

    log('RESPONDED', 'OK', {
      leadId: result.lead._id,
      statusCode: result.statusCode,
      duplicate: result.duplicate,
      queued: !!queueResult,
    });
  } catch (err) {
    log('FATAL', 'ERROR', { error: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Internal ingestion error' });
  }
});

router.post('/', optionalTenant, async (req, res) => {
  log('LEADS_ENDPOINT', 'RECEIVED', {});
  try {
    const { name, email, phone, state, source = 'form', notes, metadata } = req.body;
    const tenantId = req.tenantId || req.tenant?._id;

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant context required' });
    }

    const normalizedState = normalizeState(state);
    if (!normalizedState) {
      return res.status(400).json({ success: false, error: `Invalid state: ${state}` });
    }

    const lead = await Lead.create({
      name: name || 'Unknown',
      email: email || 'no-email@system.local',
      phone: phone || null,
      state: normalizedState,
      source,
      rawPayload: req.body,
      notes,
      metadata,
      tenantId,
      ingestionStatus: 'received',
    });

    log('LEAD_CREATED', 'OK', { leadId: lead._id });

    try {
      const routeResult = await routeLead(lead, tenantId);
      if (routeResult.assignedTo) {
        lead.assignedTo = routeResult.assignedTo;
        lead.status = 'assigned';
        lead.ingestionStatus = 'delivered';
        await lead.save();

        await Activity.create({
          type: 'lead_assigned',
          message: `Lead ${lead.name} assigned to ${routeResult.assignedBuyer?.name} (${routeResult.routingMode})`,
          clientId: routeResult.assignedTo,
          leadId: lead._id,
          tenantId,
        });

        log('ROUTED', 'ASSIGNED', { buyer: routeResult.assignedBuyer?.name, mode: routeResult.routingMode });
      } else {
        lead.status = 'unassigned';
        lead.ingestionStatus = 'delivered';
        await lead.save();

        await Activity.create({
          type: 'lead_received',
          message: `Lead received: ${lead.name} (${routeResult.reason})`,
          leadId: lead._id,
          tenantId,
        });

        log('ROUTED', 'UNASSIGNED', { reason: routeResult.reason });
      }
    } catch (routeErr) {
      log('ROUTE_ERROR', 'FAILED', { error: routeErr.message });
      lead.ingestionStatus = 'failed';
      await lead.save();
    }

    res.json({ success: true, lead, assignedTo: lead.assignedTo, status: lead.status });
  } catch (err) {
    log('LEADS_ENDPOINT_ERROR', 'ERROR', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/', authenticate, tenantIsolation, requirePermission('leads', 'read'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;
    const { status, state, assignedTo, source, campaign, search, startDate, endDate } = req.query;

    const filter = { tenantId: req.tenantId };

    if (status) filter.status = status;
    if (state) filter.state = state.toUpperCase();
    if (assignedTo) filter.assignedTo = assignedTo;
    if (source) filter.source = source;
    if (campaign) filter.campaign = campaign;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('assignedTo', 'name email state routingMode')
        .populate('duplicateOf', 'name email')
        .lean(),
      Lead.countDocuments(filter),
    ]);

    res.json({
      success: true,
      leads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + leads.length < total,
      },
    });
  } catch (err) {
    log('LEADS_LIST_ERROR', 'ERROR', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', authenticate, tenantIsolation, requirePermission('leads', 'read'), async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('assignedTo', 'name email state routingMode')
      .populate('duplicateOf', 'name email')
      .lean();

    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

    res.json({ success: true, lead });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', authenticate, tenantIsolation, requirePermission('leads', 'delete'), async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    if (lead.assignedTo) {
      await Client.findByIdAndUpdate(lead.assignedTo, { $inc: { leadsReceived: -1 } }).catch(() => {});
    }

    await Lead.findByIdAndDelete(req.params.id);
    await Activity.create({
      type: 'lead_deleted',
      message: `Lead deleted: ${lead.name}`,
      clientId: lead.assignedTo,
      tenantId: req.tenantId,
    });

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
