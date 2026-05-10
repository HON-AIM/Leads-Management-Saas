const LOG_PREFIX = '[QueueMonitor]';

function log(step, details = {}) {
  const ts = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${ts} | Step: ${step}`, details);
}

const ALERT_THRESHOLDS = {
  failedJobsPerQueue: 50,
  stalledJobsPerQueue: 10,
  waitingJobsPerQueue: 500,
  dlqDepthPerQueue: 20,
  criticalFailedJobs: 200,
};

let snapshotInterval = null;
let healthStatus = { status: 'unknown', lastCheck: null };

function attachMonitoring(queueManager) {
  const mgr = queueManager;

  for (const [name, events] of mgr.queueEvents) {
    events.on('progress', ({ jobId, data }) => {
      log('JOB_PROGRESS', { queue: name, jobId, progress: data });
    });

    events.on('completed', ({ jobId }) => {
      log('JOB_COMPLETED', { queue: name, jobId });
    });

    events.on('failed', ({ jobId, failedReason }) => {
      log('JOB_FAILED', { queue: name, jobId, reason: failedReason });
    });

    events.on('drained', () => {
      log('QUEUE_DRAINED', { queue: name });
    });

    events.on('error', (err) => {
      if (err.message?.includes('Connection') || err.code === 'ECONNREFUSED') return;
      log('QUEUE_EVENT_ERROR', { queue: name, error: err.message });
    });
  }

  _startPeriodicSnapshot(mgr);

  log('MONITORING_ATTACHED', { queues: Array.from(mgr.queueEvents.keys()) });
}

function _startPeriodicSnapshot(mgr) {
  if (snapshotInterval) clearInterval(snapshotInterval);

  snapshotInterval = setInterval(async () => {
    try {
      const health = await getSystemHealth(mgr);
      healthStatus = { status: health.status, lastCheck: new Date().toISOString() };

      const criticalAlerts = [];
      const warningAlerts = [];

      for (const [name, q] of Object.entries(health.queues)) {
        if (q.error) {
          warningAlerts.push(`${name}: unreachable`);
          continue;
        }

        if (q.failed >= ALERT_THRESHOLDS.criticalFailedJobs) {
          criticalAlerts.push(`${name}: ${q.failed} failed jobs (critical threshold: ${ALERT_THRESHOLDS.criticalFailedJobs})`);
        } else if (q.failed >= ALERT_THRESHOLDS.failedJobsPerQueue) {
          warningAlerts.push(`${name}: ${q.failed} failed jobs`);
        }

        if (q.waiting >= ALERT_THRESHOLDS.waitingJobsPerQueue) {
          warningAlerts.push(`${name}: ${q.waiting} waiting jobs (backlog)`);
        }
      }

      for (const [name, dlq] of Object.entries(health.deadLetterQueues)) {
        if (dlq.error) continue;
        if (dlq.waiting >= ALERT_THRESHOLDS.dlqDepthPerQueue) {
          warningAlerts.push(`${name}: ${dlq.waiting} jobs in DLQ`);
        }
      }

      const totalWaiting = Object.values(health.queues).reduce((s, q) => s + (q.waiting || 0), 0);
      const totalFailed = Object.values(health.queues).reduce((s, q) => s + (q.failed || 0), 0);

      if (criticalAlerts.length > 0) {
        log('CRITICAL_ALERT', { alerts: criticalAlerts });
      }

      const snapshot = {
        status: health.status,
        queues: health.queues,
        dlq: health.deadLetterQueues,
        workers: Object.keys(health.workers).length,
        totalWaiting,
        totalFailed,
        alerts: { critical: criticalAlerts, warning: warningAlerts },
        timestamp: new Date().toISOString(),
      };

      if (warningAlerts.length > 0 || criticalAlerts.length > 0) {
        log('SNAPSHOT_WITH_ALERTS', snapshot);
      } else if (process.env.NODE_ENV !== 'production') {
        log('SNAPSHOT', {
          status: health.status,
          totalJobs: totalWaiting + totalFailed,
          totalWaiting,
          totalFailed,
          workers: Object.keys(health.workers).length,
        });
      }
    } catch (err) {
      log('SNAPSHOT_ERROR', { error: err.message });
    }
  }, 60000);
}

function stopPeriodicSnapshot() {
  if (snapshotInterval) {
    clearInterval(snapshotInterval);
    snapshotInterval = null;
  }
}

async function getSystemHealth(queueManager) {
  const mgr = queueManager;
  const health = {
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    queues: {},
    deadLetterQueues: {},
    workers: {},
  };

  for (const [name, queue] of mgr.queues) {
    try {
      const counts = await queue.getJobCounts();
      health.queues[name] = {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
        paused: await queue.isPaused().catch(() => false),
        total: Object.values(counts).reduce((a, b) => a + b, 0),
      };
      if ((counts.failed || 0) > 100) health.status = 'degraded';
      if ((counts.failed || 0) > 500) health.status = 'critical';
    } catch {
      health.queues[name] = { error: 'unreachable' };
      health.status = 'degraded';
    }
  }

  for (const [name, dlq] of mgr.deadLetterQueues) {
    try {
      const counts = await dlq.getJobCounts();
      health.deadLetterQueues[name] = {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        total: Object.values(counts).reduce((a, b) => a + b, 0),
      };
    } catch {
      health.deadLetterQueues[name] = { error: 'unreachable' };
    }
  }

  for (const [name, worker] of mgr.workers) {
    health.workers[name] = {
      isRunning: worker.isRunning(),
      concurrency: worker.opts?.concurrency,
    };
  }

  return health;
}

async function logQueueSnapshot(queueManager) {
  const health = await getSystemHealth(queueManager);
  const totalJobs = Object.values(health.queues).reduce((sum, q) => sum + (q.total || 0), 0);
  const totalFailed = Object.values(health.queues).reduce((sum, q) => sum + (q.failed || 0), 0);
  const totalWaiting = Object.values(health.queues).reduce((sum, q) => sum + (q.waiting || 0), 0);

  log('SNAPSHOT', {
    status: health.status,
    totalJobs,
    totalFailed,
    totalWaiting,
    workers: Object.keys(health.workers).length,
  });
}

module.exports = { attachMonitoring, getSystemHealth, logQueueSnapshot, stopPeriodicSnapshot };
