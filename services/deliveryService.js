const Client = require('../models/Client');
const Lead = require('../models/Lead');
const { createProvider, isTransientError } = require('./deliveryProviders/provider');
const { logDeliveryAttempt, updateLeadDeliveryStatus } = require('./deliveryLogger');

const LOG_PREFIX = '[DeliveryService]';

function log(step, details = {}) {
  const ts = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${ts} | Step: ${step}`, details);
}

async function getProviderForBuyer(buyer) {
  const providerName = buyer.delivery?.provider || 'none';
  const config = buyer.delivery?.config || {};

  if (providerName === 'none') {
    return { provider: null, providerName: 'none' };
  }

  const provider = createProvider(providerName, config);
  return { provider, providerName };
}

async function deliverLeadToBuyer(leadId, tenantId) {
  log('DELIVER_START', { leadId, tenantId });

  const lead = await Lead.findById(leadId);
  if (!lead) {
    log('LEAD_NOT_FOUND', { leadId });
    return { success: false, error: 'Lead not found' };
  }

  if (!lead.assignedTo) {
    log('NOT_ASSIGNED', { leadId });
    await updateLeadDeliveryStatus(leadId, 'skipped', lead.deliveryAttempts || 0);
    return { success: true, skipped: true, reason: 'lead_not_assigned' };
  }

  if (lead.deliveryStatus === 'delivered') {
    log('ALREADY_DELIVERED', { leadId });
    return { success: true, skipped: true, reason: 'already_delivered' };
  }

  const buyer = await Client.findById(lead.assignedTo);
  if (!buyer) {
    log('BUYER_NOT_FOUND', { leadId, buyerId: lead.assignedTo });
    await updateLeadDeliveryStatus(leadId, 'failed', lead.deliveryAttempts || 0);
    return { success: false, error: 'Assigned buyer not found' };
  }

  const { provider, providerName } = await getProviderForBuyer(buyer);
  if (!provider) {
    log('NO_PROVIDER', { leadId, buyerId: buyer._id, providerName });
    await updateLeadDeliveryStatus(leadId, 'skipped', lead.deliveryAttempts || 0);
    return { success: true, skipped: true, reason: `no_provider_${providerName}` };
  }

  const attempt = (lead.deliveryAttempts || 0) + 1;
  await updateLeadDeliveryStatus(leadId, 'delivering', attempt);

  try {
    const result = await provider.sendLead(lead, buyer);

    const logEntry = {
      leadId: lead._id,
      buyerId: buyer._id,
      tenantId,
      provider: providerName,
      attempt,
      status: result.success ? 'success' : 'failed',
      requestPayload: result.requestPayload || null,
      responsePayload: result.responseBody,
      responseCode: result.statusCode,
      duration: result.duration,
      error: result.error,
    };

    await logDeliveryAttempt(logEntry);

    if (result.success) {
      await updateLeadDeliveryStatus(leadId, 'delivered', attempt);
      log('DELIVER_SUCCESS', { leadId, attempt, duration: result.duration, statusCode: result.statusCode });
      return {
        success: true,
        leadId: lead._id,
        buyerId: buyer._id,
        buyerName: buyer.name,
        provider: providerName,
        attempt,
        duration: result.duration,
        statusCode: result.statusCode,
      };
    }

    const isTransient = result.transient !== false && isTransientError(result.statusCode, result.error);

    if (isTransient) {
      await updateLeadDeliveryStatus(leadId, 'pending', attempt);
      log('DELIVER_TRANSIENT_FAILURE', { leadId, attempt, error: result.error, statusCode: result.statusCode });
    } else {
      await updateLeadDeliveryStatus(leadId, 'failed', attempt);
      log('DELIVER_PERMANENT_FAILURE', { leadId, attempt, error: result.error, statusCode: result.statusCode });
    }

    return {
      success: false,
      transient: isTransient,
      leadId: lead._id,
      buyerId: buyer._id,
      buyerName: buyer.name,
      provider: providerName,
      attempt,
      error: result.error,
      duration: result.duration,
      statusCode: result.statusCode,
    };
  } catch (err) {
    const logEntry = {
      leadId: lead._id,
      buyerId: buyer._id,
      tenantId,
      provider: providerName,
      attempt,
      status: 'failed',
      requestPayload: null,
      responsePayload: null,
      responseCode: 0,
      duration: 0,
      error: err.message,
    };

    await logDeliveryAttempt(logEntry);
    await updateLeadDeliveryStatus(leadId, 'failed', attempt);

    log('DELIVER_EXCEPTION', { leadId, attempt, error: err.message });
    return {
      success: false,
      transient: true,
      leadId: lead._id,
      buyerId: buyer._id,
      buyerName: buyer.name,
      provider: providerName,
      attempt,
      error: err.message,
      duration: 0,
      statusCode: 0,
    };
  }
}

async function attemptDeliveryWithRetry(leadId, tenantId, options = {}) {
  const { executeWithRetry } = require('./retryHandler');

  const result = await executeWithRetry(async (_, attempt) => {
    const lead = await Lead.findById(leadId);
    if (!lead) return { success: false, error: 'Lead not found' };

    if (lead.deliveryStatus === 'delivered') {
      return { success: true, skipped: true, reason: 'already_delivered' };
    }

    const deliveryResult = await deliverLeadToBuyer(leadId, tenantId);

    if (!deliveryResult.success && deliveryResult.transient === false) {
      return { ...deliveryResult, _stopRetry: true };
    }

    return deliveryResult;
  }, null, {
    maxRetries: options.maxRetries || 3,
    initialDelayMs: options.initialDelayMs || 5000,
    multiplier: options.multiplier || 2,
    maxDelayMs: options.maxDelayMs || 60000,
    jitter: true,
    stopOnCondition: (result) => result && (result.success || result._stopRetry),
  });

  return result;
}

async function verifyDelivery(leadId) {
  const lead = await Lead.findById(leadId).populate('assignedTo', 'name email');
  if (!lead) return { success: false, error: 'Lead not found' };

  const logs = await require('./deliveryLogger').getDeliveryLogsForLead(leadId);

  return {
    leadId: lead._id,
    name: lead.name,
    email: lead.email,
    state: lead.state,
    deliveryStatus: lead.deliveryStatus,
    deliveryAttempts: lead.deliveryAttempts,
    lastDeliveryAttempt: lead.lastDeliveryAttempt,
    assignedBuyer: lead.assignedTo?.name || 'Unassigned',
    logs: logs.map(l => ({
      attempt: l.attempt,
      status: l.status,
      provider: l.provider,
      responseCode: l.responseCode,
      duration: l.duration,
      error: l.error,
      attemptedAt: l.createdAt,
    })),
  };
}

module.exports = {
  deliverLeadToBuyer,
  attemptDeliveryWithRetry,
  getProviderForBuyer,
  verifyDelivery,
};
