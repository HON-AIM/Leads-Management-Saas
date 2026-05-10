const { getQueueManager } = require('./queueManager');
const { resetBuyerCapsJob, cleanupOldLogsJob, analyticsAggregationJob, retryStuckJobsJob } = require('./cronJobs');

const LOG_PREFIX = '[ScheduledJobsQueue]';
const QUEUE_NAME = 'scheduled-jobs';

const SCHEDULES = {
  resetBuyerCaps: { pattern: '0 0 * * *', key: 'scheduled-reset-buyer-caps', tz: 'America/New_York' },
  cleanupOldLogs: { pattern: '0 2 * * *', key: 'scheduled-cleanup-logs', tz: 'America/New_York' },
  analyticsAggregation: { pattern: '0 3 * * *', key: 'scheduled-analytics', tz: 'America/New_York' },
  retryStuckJobs: { pattern: '30 1 * * *', key: 'scheduled-retry-stuck', tz: 'America/New_York' },
};

async function registerScheduledJobsQueue(queueManager) {
  const mgr = queueManager || getQueueManager();

  mgr.registerQueue(QUEUE_NAME, {
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 10000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });

  mgr.registerWorker(QUEUE_NAME, async (job) => {
    const { task } = job.data;

    console.log(`${LOG_PREFIX} Running scheduled task: ${task} (jobId: ${job.id})`);

    switch (task) {
      case 'reset_buyer_caps':
        return resetBuyerCapsJob(mgr);
      case 'cleanup_old_logs':
        return cleanupOldLogsJob(mgr);
      case 'analytics_aggregation':
        return analyticsAggregationJob(mgr);
      case 'retry_stuck_jobs':
        return retryStuckJobsJob(mgr);
      default:
        console.warn(`${LOG_PREFIX} Unknown scheduled task: ${task}`);
        return { skipped: true, reason: `unknown_task_${task}` };
    }
  }, { concurrency: 2, lockDuration: 300000 });

  console.log(`${LOG_PREFIX} Registered queue: ${QUEUE_NAME}`);
  return mgr.getQueue(QUEUE_NAME);
}

async function scheduleAllJobs(queueManager) {
  const mgr = queueManager || getQueueManager();
  const results = [];

  for (const [name, schedule] of Object.entries(SCHEDULES)) {
    try {
      const existingJobs = await mgr.getRepeatableJobs(QUEUE_NAME);
      const alreadyExists = existingJobs.some(j => j.name === schedule.key && j.pattern === schedule.pattern);

      if (!alreadyExists) {
        await mgr.addRepeatableJob(QUEUE_NAME, schedule.key, {
          task: name,
          scheduledAt: new Date().toISOString(),
          timezone: schedule.tz,
        }, schedule.pattern, {
          jobId: schedule.key,
        });
        console.log(`${LOG_PREFIX} Scheduled ${name} (pattern: ${schedule.pattern})`);
      } else {
        console.log(`${LOG_PREFIX} ${name} already scheduled (pattern: ${schedule.pattern})`);
      }

      results.push({ name, pattern: schedule.pattern, scheduled: !alreadyExists });
    } catch (err) {
      console.error(`${LOG_PREFIX} Failed to schedule ${name}:`, err.message);
      results.push({ name, error: err.message });
    }
  }

  console.log(`${LOG_PREFIX} Scheduling complete`, results.map(r => `${r.name}: ${r.scheduled ? 'added' : 'exists'}`).join(', '));
  return { scheduled: results.length, details: results };
}

async function removeAllScheduledJobs(queueManager) {
  const mgr = queueManager || getQueueManager();
  const results = [];

  for (const [, schedule] of Object.entries(SCHEDULES)) {
    try {
      const result = await mgr.removeRepeatableJob(QUEUE_NAME, schedule.key, schedule.pattern);
      results.push({ job: schedule.key, removed: result.removed });
    } catch (err) {
      console.error(`${LOG_PREFIX} Failed to remove ${schedule.key}:`, err.message);
      results.push({ job: schedule.key, removed: false, error: err.message });
    }
  }

  return results;
}

async function getScheduledJobs(queueManager) {
  const mgr = queueManager || getQueueManager();
  const jobs = await mgr.getRepeatableJobs(QUEUE_NAME);
  return jobs.map(j => ({
    name: j.name,
    pattern: j.pattern,
    next: j.next,
    tz: j.tz,
    key: j.key,
  }));
}

module.exports = {
  registerScheduledJobsQueue,
  scheduleAllJobs,
  removeAllScheduledJobs,
  getScheduledJobs,
  SCHEDULES,
};
