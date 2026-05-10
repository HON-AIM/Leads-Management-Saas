const { getQueueManager } = require('./queueManager');
const { deliverLeadToBuyer } = require('../services/deliveryService');
const DeliveryLog = require('../models/DeliveryLog');
const Lead = require('../models/Lead');

const LOG_PREFIX = '[DeliveryQueue]';
const QUEUE_NAME = 'lead-delivery';

async function registerDeliveryQueue() {
  const mgr = getQueueManager();

  mgr.registerQueue(QUEUE_NAME, {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 100 },
    },
  });

  mgr.registerWorker(QUEUE_NAME, async (job) => {
    const { leadId, tenantId, buyerId } = job.data;

    console.log(`${LOG_PREFIX} Processing delivery for lead ${leadId} (attempt ${job.attemptsMade + 1})`);

    const lead = await Lead.findById(leadId);
    if (!lead) {
      console.warn(`${LOG_PREFIX} Lead ${leadId} not found, skipping delivery`);
      return { skipped: true, reason: 'lead_not_found' };
    }

    if (lead.deliveryStatus === 'delivered') {
      console.log(`${LOG_PREFIX} Lead ${leadId} already delivered, skipping`);
      return { skipped: true, reason: 'already_delivered' };
    }

    const result = await deliverLeadToBuyer(leadId, tenantId);

    if (!result.success) {
      throw new Error(result.error || 'Delivery failed');
    }

    return result;
  }, { concurrency: 5, lockDuration: 120000 });

  console.log(`${LOG_PREFIX} Registered queue: ${QUEUE_NAME} (attempts: 3, backoff: exponential 5s)`);
  return mgr.getQueue(QUEUE_NAME);
}

async function pushToDeliveryQueue(lead) {
  const mgr = getQueueManager();
  const queue = mgr.getQueue(QUEUE_NAME);
  if (!queue) throw new Error('Delivery queue not registered');

  const job = await mgr.addJob(QUEUE_NAME, 'deliver-lead', {
    leadId: lead._id,
    tenantId: lead.tenantId,
    buyerId: lead.assignedTo,
  }, {
    jobId: `delivery-${lead._id}`,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });

  return job;
}

async function pushDelayedRetry(lead, delay = 30000) {
  const mgr = getQueueManager();
  const queue = mgr.getQueue(QUEUE_NAME);
  if (!queue) throw new Error('Delivery queue not registered');

  const job = await mgr.addJob(QUEUE_NAME, 'deliver-lead-retry', {
    leadId: lead._id,
    tenantId: lead.tenantId,
    buyerId: lead.assignedTo,
  }, {
    jobId: `delivery-retry-${lead._id}-${Date.now()}`,
    delay,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });

  return job;
}

async function shutdown() {
  const mgr = getQueueManager();
  await mgr.shutdown();
}

module.exports = {
  registerDeliveryQueue,
  pushToDeliveryQueue,
  pushDelayedRetry,
  shutdown,
};
