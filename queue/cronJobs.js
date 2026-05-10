const LOG_PREFIX = '[CronJobs]';

function log(step, details = {}) {
  const ts = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${ts} | Step: ${step}`, details);
}

async function resetBuyerCapsJob(queueManager) {
  log('RESET_BUYER_CAPS_START', {});
  try {
    const { default: Client } = await import('../models/Client');
    const result = await Client.updateMany(
      { dailyLeadsReceived: { $gt: 0 } },
      { $set: { dailyLeadsReceived: 0 } }
    );
    log('RESET_BUYER_CAPS_DONE', { modifiedCount: result.modifiedCount });
    return { success: true, modified: result.modifiedCount };
  } catch (err) {
    log('RESET_BUYER_CAPS_ERROR', { error: err.message });
    return { success: false, error: err.message };
  }
}

async function cleanupOldLogsJob(queueManager) {
  log('CLEANUP_LOGS_START', {});
  try {
    const { default: DeliveryLog } = await import('../models/DeliveryLog');
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await DeliveryLog.deleteMany({ createdAt: { $lt: cutoff } });
    log('CLEANUP_LOGS_DONE', { deletedCount: result.deletedCount });
    return { success: true, deleted: result.deletedCount };
  } catch (err) {
    log('CLEANUP_LOGS_ERROR', { error: err.message });
    return { success: false, error: err.message };
  }
}

async function analyticsAggregationJob(queueManager) {
  log('ANALYTICS_AGG_START', {});
  try {
    const aggregationService = require('../services/analytics/aggregationService');

    const dailyResult = await aggregationService.runAllTenantAggregations('daily');
    log('DAILY_AGG_DONE', { succeeded: dailyResult.succeeded, failed: dailyResult.failed });

    const weeklyResult = await aggregationService.runAllTenantAggregations('weekly');
    log('WEEKLY_AGG_DONE', { succeeded: weeklyResult.succeeded, failed: weeklyResult.failed });

    const now = new Date();
    if (now.getDate() === 1) {
      const monthlyResult = await aggregationService.runAllTenantAggregations('monthly');
      log('MONTHLY_AGG_DONE', { succeeded: monthlyResult.succeeded, failed: monthlyResult.failed });
    }

    return {
      success: true,
      daily: { succeeded: dailyResult.succeeded, failed: dailyResult.failed },
      weekly: { succeeded: weeklyResult.succeeded, failed: weeklyResult.failed },
    };
  } catch (err) {
    log('ANALYTICS_AGG_ERROR', { error: err.message });
    return { success: false, error: err.message };
  }
}

async function retryStuckJobsJob(queueManager) {
  log('RETRY_STUCK_START', {});
  const mgr = queueManager;
  const results = [];

  for (const [name, queue] of mgr.queues) {
    if (name.endsWith('-dlq')) continue;
    if (name === 'scheduled-jobs') continue;

    try {
      const failedJobs = await queue.getJobs('failed', 0, 20);
      let retried = 0;

      for (const job of failedJobs) {
        try {
          if (job.attemptsMade < 5) {
            await job.retry();
            retried++;
          }
        } catch (jobErr) {
          log('RETRY_FAILED', { queue: name, jobId: job.id, error: jobErr.message });
        }
      }

      if (retried > 0) {
        results.push({ queue: name, retried });
      }
    } catch (err) {
      log('QUEUE_RETRY_ERROR', { queue: name, error: err.message });
    }
  }

  for (const [name, dlq] of mgr.deadLetterQueues) {
    try {
      const dlqJobs = await dlq.getJobs('waiting', 0, 10);
      let recovered = 0;

      for (const job of dlqJobs) {
        try {
          const { originalQueue, originalData, originalOpts } = job.data;
          if (originalQueue && originalData) {
            const targetQueue = mgr.queues.get(originalQueue);
            if (targetQueue) {
              await targetQueue.add(job.name.replace('-dlq', 'recovered'), originalData, {
                ...originalOpts,
                attempts: Math.min((originalOpts?.attempts || 3) + 1, 5),
                delay: 5000,
              });
              await job.remove();
              recovered++;
            }
          }
        } catch (jobErr) {
          log('DLQ_RECOVER_FAILED', { queue: name, jobId: job.id, error: jobErr.message });
        }
      }

      if (recovered > 0) {
        results.push({ deadLetterQueue: name, recovered });
      }
    } catch (err) {
      log('DLQ_ERROR', { queue: name, error: err.message });
    }
  }

  log('RETRY_STUCK_DONE', { results });
  return { success: true, results };
}

function registerCronJobs(queueManager) {
  log('CRON_USING_BULLMQ_REPEATABLES', {
    queues: Array.from(queueManager.queues.keys()),
  });
}

module.exports = {
  registerCronJobs,
  resetBuyerCapsJob,
  cleanupOldLogsJob,
  analyticsAggregationJob,
  retryStuckJobsJob,
};
