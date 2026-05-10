const DeliveryLog = require('../models/DeliveryLog');
const Lead = require('../models/Lead');

const LOG_PREFIX = '[DeliveryLogger]';

function log(step, details = {}) {
  const ts = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${ts} | Step: ${step}`, details);
}

function normalizeStatus(status) {
  if (['success', 'failed', 'retrying'].includes(status)) return status;
  if (status === 'delivered') return 'success';
  return 'failed';
}

async function logDeliveryAttempt({
  leadId, buyerId, tenantId, provider, attempt,
  status, requestPayload, responsePayload,
  responseCode, duration, error,
}) {
  const normalStatus = normalizeStatus(status);

  try {
    const deliveryLog = await DeliveryLog.create({
      leadId,
      buyerId,
      tenantId,
      provider,
      attempt,
      status: normalStatus,
      requestPayload: requestPayload || null,
      responsePayload: responsePayload || null,
      responseCode: responseCode || null,
      duration: duration || null,
      error: error || null,
      deliveredAt: normalStatus === 'success' ? new Date() : undefined,
    });

    return deliveryLog;
  } catch (err) {
    log('CREATE_FAILED', { leadId, attempt, error: err.message });
    try {
      const fallbackLog = new DeliveryLog({
        leadId, buyerId, tenantId, provider, attempt,
        status: normalStatus,
        error: error || err.message,
      });
      return await fallbackLog.save();
    } catch (fallbackErr) {
      log('FALLBACK_FAILED', { leadId, error: fallbackErr.message });
      return null;
    }
  }
}

async function logRetryAttempt(leadId, buyerId, tenantId, provider, attempt, reason) {
  return logDeliveryAttempt({
    leadId, buyerId, tenantId, provider, attempt,
    status: 'retrying',
    error: `Retry #${attempt}: ${reason}`,
    duration: 0,
    responseCode: null,
  });
}

async function updateLeadDeliveryStatus(leadId, status, attempt) {
  const validStatuses = ['pending', 'delivering', 'delivered', 'failed', 'skipped'];
  const normalStatus = validStatuses.includes(status) ? status : 'failed';

  try {
    const update = {
      deliveryStatus: normalStatus,
      deliveryAttempts: typeof attempt === 'number' ? attempt : 0,
      lastDeliveryAttempt: new Date(),
    };

    const result = await Lead.findByIdAndUpdate(leadId, { $set: update }, { new: true });

    if (!result) {
      log('LEAD_UPDATE_FAILED', { leadId, reason: 'lead_not_found' });
      return null;
    }

    log('LEAD_UPDATED', { leadId, deliveryStatus: normalStatus, attempt });
    return result;
  } catch (err) {
    log('LEAD_UPDATE_ERROR', { leadId, error: err.message });

    try {
      const result = await Lead.findByIdAndUpdate(leadId, {
        $set: {
          deliveryStatus: normalStatus,
          deliveryAttempts: typeof attempt === 'number' ? attempt : 0,
          lastDeliveryAttempt: new Date(),
        },
      }, { new: true });
      return result;
    } catch (retryErr) {
      log('LEAD_UPDATE_FATAL', { leadId, error: retryErr.message });
      return null;
    }
  }
}

async function getDeliveryLogsForLead(leadId) {
  return DeliveryLog.find({ leadId }).sort({ attempt: 1 });
}

async function getDeliveryLogsForTenant(tenantId, limit = 50, skip = 0) {
  return DeliveryLog.find({ tenantId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('leadId', 'name email phone state')
    .populate('buyerId', 'name');
}

async function getDeliveryStats(tenantId) {
  const stats = await DeliveryLog.aggregate([
    { $match: { tenantId: tenantId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' },
        maxDuration: { $max: '$duration' },
        minDuration: { $min: '$duration' },
      },
    },
  ]);

  const total = await DeliveryLog.countDocuments({ tenantId });
  const failed = await DeliveryLog.countDocuments({ tenantId, status: 'failed' });
  const success = await DeliveryLog.countDocuments({ tenantId, status: 'success' });
  const retrying = await DeliveryLog.countDocuments({ tenantId, status: 'retrying' });

  return { total, success, failed, retrying, byStatus: stats };
}

async function getFailedDeliveries(tenantId, limit = 20) {
  return DeliveryLog.find({ tenantId, status: 'failed' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('leadId', 'name email state')
    .populate('buyerId', 'name');
}

module.exports = {
  logDeliveryAttempt,
  logRetryAttempt,
  updateLeadDeliveryStatus,
  getDeliveryLogsForLead,
  getDeliveryLogsForTenant,
  getDeliveryStats,
  getFailedDeliveries,
};
