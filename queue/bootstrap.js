const { createQueueManager, getQueueManager } = require('./queueManager');
const { registerIngestionQueue } = require('./ingestionQueue');
const { registerDeliveryQueue } = require('./deliveryQueue');
const { registerDeliveryRetryQueue } = require('./deliveryRetryQueue');
const { registerNotificationsQueue } = require('./notificationsQueue');
const { registerAnalyticsQueue } = require('./analyticsQueue');
const { registerScheduledJobsQueue, scheduleAllJobs } = require('./scheduledJobsQueue');
const { attachMonitoring } = require('./monitoringHooks');
const { registerCronJobs } = require('./cronJobs');

const LOG_PREFIX = '[QueueBootstrap]';

function log(step, details = {}) {
  const ts = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${ts} | Step: ${step}`, details);
}

async function bootQueueSystem() {
  log('BOOT_START', {});

  const mgr = await createQueueManager();
  log('CONNECTION_ESTABLISHED', { host: process.env.REDIS_HOST || 'localhost' });

  await registerIngestionQueue();
  log('QUEUE_REGISTERED', { name: 'lead-processing' });

  await registerDeliveryQueue();
  log('QUEUE_REGISTERED', { name: 'lead-delivery' });

  await registerDeliveryRetryQueue();
  log('QUEUE_REGISTERED', { name: 'delivery-retry' });

  await registerNotificationsQueue();
  log('QUEUE_REGISTERED', { name: 'notifications' });

  await registerAnalyticsQueue();
  log('QUEUE_REGISTERED', { name: 'analytics' });

  await registerScheduledJobsQueue(mgr);
  log('QUEUE_REGISTERED', { name: 'scheduled-jobs' });

  attachMonitoring(mgr);
  log('MONITORING_ATTACHED', {});

  registerCronJobs(mgr);

  await scheduleAllJobs(mgr);
  log('SCHEDULED_JOBS_INITIALIZED', {});

  const queueList = Array.from(mgr.queues.keys()).filter(k => !k.endsWith('-dlq'));
  const dlqList = Array.from(mgr.deadLetterQueues.keys());
  const workerList = Array.from(mgr.workers.keys());

  log('BOOT_COMPLETE', {
    queues: queueList,
    deadLetterQueues: dlqList,
    workers: workerList,
    concurrency: workerList.map(w => {
      const worker = mgr.getWorker(w);
      return `${w}=${worker?.opts?.concurrency || '?'}`;
    }).join(', '),
  });

  return mgr;
}

async function shutdownQueueSystem() {
  log('SHUTDOWN_START', {});
  const mgr = getQueueManager();
  await mgr.shutdown();
  log('SHUTDOWN_COMPLETE', {});
}

async function safeShutdown() {
  const timeout = setTimeout(() => {
    console.error(`${LOG_PREFIX} Forced shutdown after 15s timeout`);
    process.exit(1);
  }, 15000);

  try {
    await shutdownQueueSystem();
  } catch (err) {
    console.error(`${LOG_PREFIX} Shutdown error:`, err.message);
  } finally {
    clearTimeout(timeout);
    process.exit(0);
  }
}

process.on('SIGTERM', async () => {
  log('SIGTERM_RECEIVED', {});
  await safeShutdown();
});

process.on('SIGINT', async () => {
  log('SIGINT_RECEIVED', {});
  await safeShutdown();
});

process.on('uncaughtException', async (err) => {
  console.error(`${LOG_PREFIX} Uncaught exception:`, err.message, err.stack);
  await safeShutdown();
});

process.on('unhandledRejection', async (reason) => {
  console.error(`${LOG_PREFIX} Unhandled rejection:`, reason?.message || reason);
});

module.exports = { bootQueueSystem, shutdownQueueSystem };
