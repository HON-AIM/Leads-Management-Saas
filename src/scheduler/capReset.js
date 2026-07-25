const cron = require('node-cron');
const mongoose = require('mongoose');
const Buyer = require('../models/Buyer');
const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');

function startCapResetScheduler() {
  cron.schedule('0 0 * * *', async () => {
    const startedAt = new Date();
    logger.info('[CapReset] Daily cap reset triggered');
    try {
      const result = await Buyer.updateMany({}, { $set: { dailyLeadsReceived: 0 } });
      const logEntry = await ActivityLog.create({
        action: 'daily_caps_reset',
        category: 'cap_reset',
        details: { buyerCount: result.modifiedCount, triggeredBy: 'scheduler' },
        tenantId: null,
      });
      logger.info(`[CapReset] Daily reset complete — ${result.modifiedCount} buyers reset`, { logId: logEntry._id, durationMs: Date.now() - startedAt.getTime() });
    } catch (err) {
      logger.error('[CapReset] Daily reset failed', { error: err.message });
    }
  }, { timezone: 'UTC' });

  cron.schedule('0 0 1 * *', async () => {
    const startedAt = new Date();
    logger.info('[CapReset] Monthly cap reset triggered');
    try {
      const result = await Buyer.updateMany({}, { $set: { monthlyLeadsReceived: 0 } });
      const logEntry = await ActivityLog.create({
        action: 'monthly_caps_reset',
        category: 'cap_reset',
        details: { buyerCount: result.modifiedCount, triggeredBy: 'scheduler' },
        tenantId: null,
      });
      logger.info(`[CapReset] Monthly reset complete — ${result.modifiedCount} buyers reset`, { logId: logEntry._id, durationMs: Date.now() - startedAt.getTime() });
    } catch (err) {
      logger.error('[CapReset] Monthly reset failed', { error: err.message });
    }
  }, { timezone: 'UTC' });

  logger.info('[CapReset] Scheduler registered — daily (0 0 * * *) and monthly (0 0 1 * *)');
}

module.exports = { startCapResetScheduler };
