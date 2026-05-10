const { getQueueManager } = require('./queueManager');

const LOG_PREFIX = '[AnalyticsQueue]';

function log(step, details = {}) {
  const ts = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${ts} | Step: ${step}`, details);
}

const QUEUE_NAME = 'analytics';

async function registerAnalyticsQueue() {
  const mgr = getQueueManager();

  mgr.registerQueue(QUEUE_NAME, {
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 10000 },
      removeOnComplete: 100,
      removeOnFail: 20,
    },
  });

  const worker = mgr.registerWorker(QUEUE_NAME, async (job) => {
    const { event, timestamp, data } = job.data;

    log('PROCESSING', { event, jobId: job.id });

    switch (event) {
      case 'lead_ingested':
        return await trackLeadIngested(data);
      case 'lead_routed':
        return await trackLeadRouted(data);
      case 'lead_delivered':
        return await trackLeadDelivered(data);
      case 'lead_failed':
        return await trackLeadFailed(data);
      case 'buyer_cap_reached':
        return await trackBuyerCapReached(data);
      default:
        log('UNKNOWN_EVENT', { event });
        return { skipped: true, reason: `unknown_event_${event}` };
    }
  }, { concurrency: 2 });

  log('REGISTERED', { queue: QUEUE_NAME });
  return mgr.getQueue(QUEUE_NAME);
}

async function trackLeadIngested(data) {
  log('TRACK_INGESTED', { source: data?.source, state: data?.state });
  return { tracked: true, event: 'lead_ingested' };
}

async function trackLeadRouted(data) {
  log('TRACK_ROUTED', { buyerId: data?.buyerId, mode: data?.routingMode });
  return { tracked: true, event: 'lead_routed' };
}

async function trackLeadDelivered(data) {
  log('TRACK_DELIVERED', { provider: data?.provider, duration: data?.duration, success: data?.success });
  return { tracked: true, event: 'lead_delivered' };
}

async function trackLeadFailed(data) {
  log('TRACK_FAILED', { reason: data?.reason, attempts: data?.attempts });
  return { tracked: true, event: 'lead_failed' };
}

async function trackBuyerCapReached(data) {
  log('TRACK_CAP_REACHED', { buyerId: data?.buyerId, capType: data?.capType });
  return { tracked: true, event: 'buyer_cap_reached' };
}

async function pushAnalyticsEvent(event, data, opts = {}) {
  const mgr = getQueueManager();
  const queue = mgr.getQueue(QUEUE_NAME);
  if (!queue) throw new Error('Analytics queue not registered');

  const job = await queue.add('process-analytics', {
    event,
    timestamp: new Date().toISOString(),
    data,
  }, opts);

  return job;
}

module.exports = {
  registerAnalyticsQueue,
  pushAnalyticsEvent,
};
