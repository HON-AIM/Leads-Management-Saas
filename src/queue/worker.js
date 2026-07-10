const config = require('../config');
const logger = require('../utils/logger');
const { connectDatabase, disconnectDatabase } = require('../config/database');
const { createLeadWorker, closeQueue } = require('./index');

async function startWorker() {
  logger.info('Starting lead processing worker...');

  await connectDatabase();

  const { processLead } = require('./leadProcessor');
  createLeadWorker(processLead);

  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down worker`);
    await closeQueue();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  logger.info('Worker ready to process leads');
}

startWorker().catch((err) => {
  logger.error('Worker failed to start', { error: err.message });
  process.exit(1);
});
