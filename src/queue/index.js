const { Queue, Worker } = require('bullmq');
const config = require('../config');
const logger = require('../utils/logger');

const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  tls: config.redis.tls || undefined,
  maxRetriesPerRequest: null,
};

let leadQueue = null;
let leadWorker = null;
let queueAvailable = false;

function getLeadQueue() {
  if (!leadQueue) {
    leadQueue = new Queue('lead-processing', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
    leadQueue.on('error', (err) => {
      if (queueAvailable) {
        logger.warn('Redis queue connection lost — falling back to inline processing', { error: err.message });
        queueAvailable = false;
      }
    });
  }
  return leadQueue;
}

async function initializeQueue() {
  try {
    const queue = getLeadQueue();
    await Promise.race([
      queue.waitUntilReady(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 3000)),
    ]);
    queueAvailable = true;
    logger.info('Redis queue connected and ready');
    return true;
  } catch (err) {
    queueAvailable = false;
    try { await leadQueue?.close(); } catch (_) {}
    leadQueue = null;
    logger.warn('Redis unavailable — using inline processing fallback', { error: err.message });
    return false;
  }
}

function isQueueAvailable() {
  return queueAvailable;
}

function createLeadWorker(processFn) {
  leadWorker = new Worker('lead-processing', async (job) => {
    logger.info('Processing lead job', { jobId: job.id, leadId: job.data.leadId });
    return processFn(job.data);
  }, {
    connection,
    concurrency: 10,
    limiter: { max: 50, duration: 1000 },
  });

  leadWorker.on('completed', (job) => {
    logger.info('Lead job completed', { jobId: job.id, leadId: job.data.leadId });
  });

  leadWorker.on('failed', (job, err) => {
    logger.error('Lead job failed', {
      jobId: job?.id,
      leadId: job?.data?.leadId,
      error: err.message,
      attemptsMade: job?.attemptsMade,
    });
  });

  leadWorker.on('error', (err) => {
    if (queueAvailable) {
      logger.warn('Worker Redis connection lost', { error: err.message });
      queueAvailable = false;
    }
  });

  logger.info('Lead processing worker started (concurrency: 10)');
  return leadWorker;
}

async function addLeadJob(data) {
  if (!queueAvailable) return null;
  try {
    const queue = getLeadQueue();
    const job = await queue.add('process-lead', data, {
      priority: data.priority || 5,
    });
    return job;
  } catch (err) {
    logger.warn('Failed to enqueue lead — falling back to inline', { error: err.message });
    queueAvailable = false;
    return null;
  }
}

async function closeQueue() {
  if (leadWorker) {
    await leadWorker.close();
    leadWorker = null;
  }
  if (leadQueue) {
    await leadQueue.close();
    leadQueue = null;
  }
  queueAvailable = false;
  logger.info('Queue system shut down');
}

module.exports = { initializeQueue, isQueueAvailable, getLeadQueue, createLeadWorker, addLeadJob, closeQueue };
