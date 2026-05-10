const { Queue, Worker, QueueEvents } = require('bullmq');
const IORedis = require('ioredis');

const LOG_PREFIX = '[QueueManager]';

class QueueManager {
  constructor() {
    this.connection = null;
    this.queues = new Map();
    this.workers = new Map();
    this.queueEvents = new Map();
    this.deadLetterQueues = new Map();
    this.isShuttingDown = false;
    this.healthCheckInterval = null;
    this.connectionState = { status: 'disconnected', lastConnected: null, reconnectAttempts: 0 };
    this.metrics = {
      jobsAdded: 0, jobsCompleted: 0, jobsFailed: 0, jobsRetried: 0, jobsStalled: 0,
      perQueue: {},
      startedAt: Date.now(),
    };
  }

  async initialize() {
    this.connection = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        if (times > 20) {
          console.error(`${LOG_PREFIX} Redis retry exhausted after ${times} attempts`);
          return null;
        }
        return Math.min(times * 200, 5000);
      },
      enableReadyCheck: true,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
    });

    this.connection.on('connect', () => {
      this.connectionState.status = 'connected';
      this.connectionState.lastConnected = new Date();
      this.connectionState.reconnectAttempts = 0;
    });

    this.connection.on('ready', () => {
      this.connectionState.status = 'ready';
    });

    this.connection.on('close', () => {
      this.connectionState.status = 'disconnected';
    });

    this.connection.on('reconnecting', () => {
      this.connectionState.status = 'reconnecting';
      this.connectionState.reconnectAttempts++;
    });

    this.connection.on('error', (err) => {
      if (err.message?.includes('ECONNREFUSED') || err.message?.includes('connect')) return;
      console.error(`${LOG_PREFIX} Redis error:`, err.message);
    });

    await this.connection.connect();
    this.connectionState.status = 'ready';
    this.connectionState.lastConnected = new Date();
    this._startHealthCheck();

    return this;
  }

  _startHealthCheck() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        if (this.connection && this.connection.status !== 'ready') {
          console.warn(`${LOG_PREFIX} Health: Redis status is "${this.connection.status}", attempting reconnect`);
        }
      } catch {
        console.error(`${LOG_PREFIX} Health check failed`);
      }
    }, 30000);
  }

  _trackMetric(queueName, metric) {
    if (!this.metrics.perQueue[queueName]) {
      this.metrics.perQueue[queueName] = { completed: 0, failed: 0, stalled: 0, total: 0 };
    }
    this.metrics.perQueue[queueName][metric] = (this.metrics.perQueue[queueName][metric] || 0) + 1;
    this.metrics.perQueue[queueName].total++;
  }

  registerQueue(name, opts = {}) {
    if (this.queues.has(name)) return this.queues.get(name);

    const defaults = {
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 100 },
      },
    };

    const config = this._mergeConfig(defaults, opts);
    const queue = new Queue(name, { connection: this.connection, ...config });
    this.queues.set(name, queue);

    if (config.deadLetter !== false) {
      const dlqName = `${name}-dlq`;
      const dlq = new Queue(dlqName, {
        connection: this.connection,
        defaultJobOptions: { removeOnComplete: { count: 200 }, removeOnFail: { count: 50 } },
      });
      this.deadLetterQueues.set(name, dlq);
    }

    const events = new QueueEvents(name, { connection: this.connection });
    this.queueEvents.set(name, events);

    return queue;
  }

  registerWorker(name, processor, opts = {}) {
    if (this.workers.has(name)) {
      const existing = this.workers.get(name);
      existing.close(true).catch(() => {});
    }

    const defaults = {
      concurrency: 5,
      lockDuration: 60000,
      lockRenewTime: 15000,
      stalledInterval: 30000,
      maxStalledCount: 3,
    };

    const config = { ...defaults, ...opts };

    const worker = new Worker(name, async (job) => {
      if (this.isShuttingDown) {
        await job.discard();
        return { discarded: true, reason: 'shutting_down' };
      }

      try {
        const result = await processor(job);
        this.metrics.jobsCompleted++;
        this._trackMetric(name, 'completed');
        return result;
      } catch (err) {
        this.metrics.jobsFailed++;
        this._trackMetric(name, 'failed');
        throw err;
      }
    }, { connection: this.connection, ...config });

    worker.on('failed', async (job, err) => {
      const attempts = job?.attemptsMade || 0;
      const maxAttempts = job?.opts?.attempts || 3;

      if (attempts >= maxAttempts) {
        await this._sendToDeadLetter(name, job, err);
      }
    });

    worker.on('error', (err) => {
      if (err.message?.includes('Connection') || err.code === 'ECONNREFUSED') return;
      console.error(`${LOG_PREFIX} Worker ${name} error:`, err.message);
    });

    worker.on('stalled', (jobId) => {
      console.warn(`${LOG_PREFIX} Job stalled: ${jobId} in queue ${name}`);
      this.metrics.jobsStalled++;
      this._trackMetric(name, 'stalled');
    });

    this.workers.set(name, worker);
    return worker;
  }

  async _sendToDeadLetter(queueName, job, err) {
    try {
      const dlq = this.deadLetterQueues.get(queueName);
      if (!dlq) return;

      await dlq.add(`${job.name}-dlq`, {
        originalQueue: queueName,
        originalJobId: job.id,
        originalData: job.data,
        originalOpts: job.opts,
        failedAt: new Date().toISOString(),
        error: err?.message || 'Unknown error',
        attemptsMade: job.attemptsMade,
      }, {
        jobId: `dlq-${queueName}-${job.id}-${Date.now()}`,
        attempts: 1,
      });

      this.metrics.jobsRetried++;
    } catch (dlqErr) {
      console.error(`${LOG_PREFIX} Failed to send to DLQ for ${queueName}:`, dlqErr.message);
    }
  }

  getQueue(name) {
    return this.queues.get(name) || null;
  }

  getWorker(name) {
    return this.workers.get(name) || null;
  }

  getDeadLetterQueue(name) {
    return this.deadLetterQueues.get(name) || null;
  }

  async addJob(queueName, jobName, data, opts = {}) {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not registered`);

    const defaults = {
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 100 },
    };

    const job = await queue.add(jobName, data, { ...defaults, ...opts });
    this.metrics.jobsAdded++;
    return job;
  }

  async addRepeatableJob(queueName, jobName, data, pattern, opts = {}) {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not registered`);

    const job = await queue.add(jobName, data, {
      repeat: { pattern },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
      ...opts,
    });

    return job;
  }

  async removeRepeatableJob(queueName, jobName, pattern) {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not registered`);

    const repeatableJobs = await queue.getRepeatableJobs();
    for (const rj of repeatableJobs) {
      if (rj.name === jobName && rj.pattern === pattern) {
        await queue.removeRepeatableByKey(rj.key);
        return { removed: true, key: rj.key };
      }
    }

    return { removed: false, reason: 'not_found' };
  }

  async getRepeatableJobs(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not registered`);
    return queue.getRepeatableJobs();
  }

  async getMetrics() {
    const queueStats = {};
    for (const [name, queue] of this.queues) {
      try {
        const jobCounts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused');
        queueStats[name] = jobCounts;
      } catch { queueStats[name] = { error: 'unavailable' }; }
    }

    const dlqStats = {};
    for (const [name, dlq] of this.deadLetterQueues) {
      try {
        dlqStats[name] = await dlq.getJobCounts('waiting', 'active', 'completed', 'failed');
      } catch { dlqStats[name] = { error: 'unavailable' }; }
    }

    return {
      uptime: Date.now() - this.metrics.startedAt,
      runtime: {
        jobsAdded: this.metrics.jobsAdded,
        jobsCompleted: this.metrics.jobsCompleted,
        jobsFailed: this.metrics.jobsFailed,
        jobsRetried: this.metrics.jobsRetried,
        jobsStalled: this.metrics.jobsStalled,
      },
      queues: queueStats,
      deadLetterQueues: dlqStats,
      workers: Array.from(this.workers.keys()),
      perQueue: this.metrics.perQueue,
      connection: this.connectionState,
      isShuttingDown: this.isShuttingDown,
    };
  }

  async getSystemHealth() {
    const health = { status: 'healthy', queues: {}, workers: {}, connection: this.connectionState.status };

    let degraded = false;
    let critical = false;

    for (const [name, queue] of this.queues) {
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
        if ((counts.failed || 0) > 100) degraded = true;
        if ((counts.failed || 0) > 500) critical = true;
        if ((counts.waiting || 0) > 1000) degraded = true;
      } catch {
        health.queues[name] = { error: 'unreachable' };
        degraded = true;
      }
    }

    for (const [name, worker] of this.workers) {
      health.workers[name] = { isRunning: worker.isRunning(), concurrency: worker.opts?.concurrency };
    }

    if (critical) health.status = 'critical';
    else if (degraded) health.status = 'degraded';
    if (this.connectionState.status !== 'ready') health.status = 'critical';

    return health;
  }

  async retryFailedJob(queueName, jobId) {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not registered`);

    const job = await queue.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found in ${queueName}`);

    await job.retry();
    this.metrics.jobsRetried++;
    return { retried: true, jobId };
  }

  async retryAllFailedJobs(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not registered`);

    const failedJobs = await queue.getJobs('failed', 0, 100);
    let retried = 0;

    for (const job of failedJobs) {
      try {
        if (job.attemptsMade < 10) {
          await job.retry();
          retried++;
          this.metrics.jobsRetried++;
        }
      } catch (err) {
        console.warn(`${LOG_PREFIX} Failed to retry job ${job.id}:`, err.message);
      }
    }

    return { retried, total: failedJobs.length };
  }

  async recoverFromDeadLetter(queueName, maxJobs = 25) {
    const dlq = this.deadLetterQueues.get(queueName);
    if (!dlq) throw new Error(`No DLQ for ${queueName}`);

    const jobs = await dlq.getJobs('waiting', 0, maxJobs);
    const recovered = [];

    for (const job of jobs) {
      try {
        const { originalQueue, originalData, originalOpts } = job.data;
        if (!originalQueue || !originalData) continue;

        const targetQueue = this.queues.get(originalQueue);
        if (!targetQueue) continue;

        await targetQueue.add(job.name.replace('-dlq', 'recovered'), originalData, {
          ...originalOpts,
          attempts: Math.min((originalOpts?.attempts || 3) + 1, 5),
          delay: 5000,
        });

        await job.remove();
        recovered.push({ originalJobId: job.data.originalJobId, queue: originalQueue });
      } catch (err) {
        console.warn(`${LOG_PREFIX} DLQ recover error for job ${job.id}:`, err.message);
      }
    }

    return { recovered: recovered.length, jobs: recovered };
  }

  async recoverAllDeadLetterQueues(maxPerQueue = 10) {
    const results = [];
    for (const [name] of this.deadLetterQueues) {
      const result = await this.recoverFromDeadLetter(name, maxPerQueue);
      if (result.recovered > 0) results.push({ queue: name, ...result });
    }
    return results;
  }

  async pauseQueue(name) {
    const queue = this.queues.get(name);
    if (queue) await queue.pause();
  }

  async resumeQueue(name) {
    const queue = this.queues.get(name);
    if (queue) await queue.resume();
  }

  async isQueuePaused(name) {
    const queue = this.queues.get(name);
    if (queue) return queue.isPaused();
    return false;
  }

  async cleanQueues(age = 24 * 60 * 60 * 1000) {
    const results = {};
    for (const [name, queue] of this.queues) {
      try {
        const completed = await queue.clean(age, 1000, 'completed');
        const failed = await queue.clean(age, 500, 'failed');
        results[name] = { completedCleaned: completed.length, failedCleaned: failed.length };
      } catch (err) {
        results[name] = { error: err.message };
      }
    }
    return results;
  }

  async shutdown() {
    this.isShuttingDown = true;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    const workerClosePromises = [];
    for (const [name, worker] of this.workers) {
      workerClosePromises.push(
        worker.close(true).catch(err => console.warn(`${LOG_PREFIX} Error closing worker ${name}:`, err.message))
      );
    }
    await Promise.all(workerClosePromises);

    const eventsClosePromises = [];
    for (const [name, events] of this.queueEvents) {
      eventsClosePromises.push(
        events.close().catch(() => {})
      );
    }
    await Promise.all(eventsClosePromises);

    if (this.connection) {
      try {
        await this.connection.quit();
      } catch {
        await this.connection.disconnect().catch(() => {});
      }
    }

    this.workers.clear();
    this.queues.clear();
    this.queueEvents.clear();
    this.deadLetterQueues.clear();
  }

  async resetMetrics() {
    this.metrics = {
      jobsAdded: 0, jobsCompleted: 0, jobsFailed: 0, jobsRetried: 0, jobsStalled: 0,
      perQueue: {},
      startedAt: Date.now(),
    };
  }

  _mergeConfig(defaults, opts) {
    const merged = { ...defaults, ...opts };
    merged.defaultJobOptions = { ...defaults.defaultJobOptions, ...(opts.defaultJobOptions || {}) };
    return merged;
  }
}

let instance = null;

function getQueueManager() {
  if (!instance) {
    instance = new QueueManager();
  }
  return instance;
}

async function createQueueManager() {
  const mgr = getQueueManager();
  await mgr.initialize();
  return mgr;
}

module.exports = { QueueManager, getQueueManager, createQueueManager };
