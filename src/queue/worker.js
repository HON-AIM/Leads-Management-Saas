const config = require('../config');
const logger = require('../utils/logger');
const { connectDatabase, disconnectDatabase } = require('../config/database');
const { createLeadWorker, closeQueue } = require('./index');

let workerStarted = false;

async function startWorker() {
  if (workerStarted) return;
  workerStarted = true;

  logger.info('Starting lead processing worker...');

  const { processLead } = require('./leadProcessor');
  createLeadWorker(processLead);

  logger.info('Worker ready to process leads');
}

async function shutdownWorker() {
  if (!workerStarted) return;
  logger.info('Shutting down worker...');
  await closeQueue();
  workerStarted = false;
}

if (require.main === module) {
  (async () => {
    await connectDatabase();

    await startWorker();

    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down worker`);
      await shutdownWorker();
      await disconnectDatabase();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    logger.info('Worker process ready');
  })().catch((err) => {
    logger.error('Worker failed to start', { error: err.message });
    process.exit(1);
  });
}

module.exports = { startWorker, shutdownWorker };
