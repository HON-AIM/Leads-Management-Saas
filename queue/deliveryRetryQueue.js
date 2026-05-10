const { getQueueManager } = require('./queueManager');
const Lead = require('../models/Lead');
const { deliverLeadToBuyer } = require('../services/deliveryService');
const { pushToDeliveryQueue } = require('./deliveryQueue');

const LOG_PREFIX = '[DeliveryRetryQueue]';
const QUEUE_NAME = 'delivery-retry';

async function registerDeliveryRetryQueue() {
  const mgr = getQueueManager();

  mgr.registerQueue(QUEUE_NAME, {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 30000 },
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 50 },
    },
  });

  mgr.registerWorker(QUEUE_NAME, async (job) => {
    const { leadId, tenantId, buyerId, reason } = job.data;

    console.log(`${LOG_PREFIX} Retry attempt ${job.attemptsMade + 1}/${job.opts?.attempts || 3} for lead ${leadId} (reason: ${reason})`);

    const lead = await Lead.findById(leadId);
    if (!lead) {
      console.warn(`${LOG_PREFIX} Lead ${leadId} not found, skipping retry`);
      return { skipped: true, reason: 'lead_not_found' };
    }

    if (lead.deliveryStatus === 'delivered') {
      console.log(`${LOG_PREFIX} Lead ${leadId} already delivered, skipping retry`);
      return { skipped: true, reason: 'already_delivered' };
    }

    if (lead.deliveryStatus === 'pending' && !lead.assignedTo) {
      console.log(`${LOG_PREFIX} Lead ${leadId} no longer assigned, skipping retry`);
      return { skipped: true, reason: 'unassigned' };
    }

    const result = await deliverLeadToBuyer(leadId, tenantId);

    if (!result.success) {
      console.warn(`${LOG_PREFIX} Retry failed for lead ${leadId} attempt ${job.attemptsMade + 1}: ${result.error}`);
      throw new Error(result.error || 'Retry delivery failed');
    }

    console.log(`${LOG_PREFIX} Retry succeeded for lead ${leadId}`);
    return result;
  }, { concurrency: 3, lockDuration: 120000 });

  console.log(`${LOG_PREFIX} Registered queue: ${QUEUE_NAME} (attempts: 3, backoff: exponential 30s)`);
  return mgr.getQueue(QUEUE_NAME);
}

async function pushToDeliveryRetry(lead, reason) {
  const mgr = getQueueManager();
  const queue = mgr.getQueue(QUEUE_NAME);
  if (!queue) throw new Error('Delivery retry queue not registered');

  const job = await mgr.addJob(QUEUE_NAME, 'retry-delivery', {
    leadId: lead._id,
    tenantId: lead.tenantId,
    buyerId: lead.assignedTo,
    reason,
  }, {
    jobId: `retry-${lead._id}-${Date.now()}`,
    attempts: 3,
    backoff: { type: 'exponential', delay: 30000 },
  });

  console.log(`${LOG_PREFIX} Queued retry for lead ${lead._id} (reason: ${reason})`);
  return job;
}

async function pushBulkRetry(leads, reason) {
  const results = [];
  for (const lead of leads) {
    try {
      const job = await pushToDeliveryRetry(lead, reason);
      results.push({ leadId: lead._id, queued: true, jobId: job.id });
    } catch (err) {
      results.push({ leadId: lead._id, queued: false, error: err.message });
    }
  }
  return results;
}

module.exports = {
  registerDeliveryRetryQueue,
  pushToDeliveryRetry,
  pushBulkRetry,
};
