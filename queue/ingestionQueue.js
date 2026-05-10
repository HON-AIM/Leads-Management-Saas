const { getQueueManager } = require('./queueManager');
const Lead = require('../models/Lead');
const { routeLead } = require('../services/routingService');
const { pushToDeliveryQueue } = require('./deliveryQueue');

const INGESTION_LOG_PREFIX = '[IngestionQueue]';
const QUEUE_NAME = 'lead-processing';

function log(step, jobData, result, details = {}) {
  const ts = new Date().toISOString();
  const id = jobData?.leadId || 'PENDING';
  const src = jobData?.source || 'unknown';
  console.log(`${INGESTION_LOG_PREFIX} ${ts} | LeadID: ${id} | Source: ${src} | Step: ${step} | Result: ${result}`, details);
}

async function registerIngestionQueue() {
  const mgr = getQueueManager();

  mgr.registerQueue(QUEUE_NAME, {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 500,
      removeOnFail: 100,
    },
  });

  mgr.registerWorker(QUEUE_NAME, async (job) => {
    const { leadId, tenantId, source } = job.data;
    const jobData = { leadId, source };

    log('WORKER_START', jobData, 'PROCESSING', { jobId: job.id });

    const lead = await Lead.findById(leadId);
    if (!lead) {
      log('WORKER_ERROR', jobData, 'LEAD_NOT_FOUND', { leadId });
      throw new Error(`Lead ${leadId} not found`);
    }

    if (lead.ingestionStatus === 'duplicate') {
      log('WORKER_SKIP', jobData, 'DUPLICATE_SKIP', {});
      return { skipped: true, reason: 'duplicate' };
    }

    lead.ingestionStatus = 'queued';
    await lead.save();
    log('STATUS_UPDATE', jobData, 'QUEUED', {});

    lead.ingestionStatus = 'routing';
    await lead.save();
    log('STATUS_UPDATE', jobData, 'ROUTING', {});

    try {
      const routeResult = await routeLead(lead, tenantId);

      if (routeResult.assignedTo) {
        lead.assignedTo = routeResult.assignedTo;
        lead.status = 'assigned';
        lead.ingestionStatus = 'delivered';
      } else {
        lead.status = 'unassigned';
        lead.ingestionStatus = 'delivered';
      }

      const buyerName = routeResult.assignedBuyer?.name || null;
      lead.notes = lead.notes
        ? `${lead.notes}\n[Routing] ${routeResult.reason} (mode: ${routeResult.routingMode || 'unknown'})${buyerName ? ` → ${buyerName}` : ''}`
        : `[Routing] ${routeResult.reason} (mode: ${routeResult.routingMode || 'unknown'})${buyerName ? ` → ${buyerName}` : ''}`;

      await lead.save();

      if (routeResult.assignedTo) {
        try {
          await pushToDeliveryQueue(lead);
          log('DELIVERY_QUEUED', jobData, 'OK', { leadId: lead._id });
        } catch (deliveryErr) {
          log('DELIVERY_QUEUE_ERROR', jobData, 'FAILED', { error: deliveryErr.message });
        }
      }

      log('WORKER_COMPLETE', jobData, 'DELIVERED', { reason: routeResult.reason, buyer: buyerName, mode: routeResult.routingMode });

      return { delivered: true, reason: routeResult.reason, assignedTo: buyerName, routingMode: routeResult.routingMode };
    } catch (err) {
      lead.ingestionStatus = 'failed';
      await lead.save();
      log('WORKER_ERROR', jobData, 'FAILED', { error: err.message });
      throw err;
    }
  }, { concurrency: 10, lockDuration: 60000 });

  log('REGISTERED', { queue: QUEUE_NAME });
  return mgr.getQueue(QUEUE_NAME);
}

async function pushToQueue(lead) {
  const mgr = getQueueManager();
  const queue = mgr.getQueue(QUEUE_NAME);
  if (!queue) throw new Error('Ingestion queue not registered');

  const job = await mgr.addJob(QUEUE_NAME, 'process-lead', {
    leadId: lead._id,
    tenantId: lead.tenantId,
    source: lead.source,
    campaign: lead.campaign,
    email: lead.email,
    phone: lead.phone,
  }, {
    jobId: `lead-${lead._id}`,
  });

  return job;
}

async function shutdown() {
  const mgr = getQueueManager();
  await mgr.shutdown();
}

module.exports = {
  registerIngestionQueue,
  pushToQueue,
  shutdown,
};
