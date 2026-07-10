const { Queue, Worker } = require('bullmq');
const config = require('../config');
const logger = require('../utils/logger');

const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  maxRetriesPerRequest: null,
};

let leadQueue = null;
let leadWorker = null;

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
    logger.info('Lead processing queue initialized');
  }
  return leadQueue;
}

function createLeadWorker(processFn) {
  leadWorker = new Worker('lead-processing', async (job) => {
    return processFn(job.data);
  }, {
    connection,
    concurrency: 10,
    limiter: { max: 50, duration: 1000 },
  });

  leadWorker.on('completed', (job) => {
    logger.debug('Lead job completed', { jobId: job.id });
  });

  leadWorker.on('failed', (job, err) => {
    logger.error('Lead job failed', { jobId: job?.id, error: err.message });
  });

  logger.info('Lead processing worker started (concurrency: 10)');
  return leadWorker;
}

async function addLeadJob(data) {
  const queue = getLeadQueue();
  return queue.add('process-lead', data, {
    priority: data.priority || 5,
  });
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
  logger.info('Queue system shut down');
}

module.exports = { getLeadQueue, createLeadWorker, addLeadJob, closeQueue };
