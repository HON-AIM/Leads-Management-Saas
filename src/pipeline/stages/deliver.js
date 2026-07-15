const { attemptDelivery } = require('../../services/deliveryAttemptService');
const leadAssignmentRepo = require('../../repositories/leadAssignmentRepository');
const leadService = require('../../services/leadService');
const config = require('../../config');
const logger = require('../../utils/logger');

async function deliver(ctx) {
  const { assignment, lead, selectedBuyer } = ctx;
  if (!assignment || !selectedBuyer) return;

  const buyer = selectedBuyer.buyer;

  if (!buyer.delivery || buyer.delivery.provider === 'none' || !buyer.delivery.url) {
    await leadAssignmentRepo.updateStatus(assignment._id, 'delivered', { deliveredAt: new Date() });
    await leadService.markDelivered(lead._id, lead.tenantId);
    ctx.deliveryResult = { success: true, method: 'no-op' };
    return;
  }

  const maxRetries = config.delivery.maxRetries;
  const timeout = config.delivery.initialDelayMs;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;

    const result = await attemptDelivery({
      leadAssignment: assignment,
      lead,
      buyer,
      triggeredBy: 'automatic',
      tenantId: lead.tenantId,
    });

    if (result.success) {
      ctx.deliveryResult = { success: true, statusCode: result.statusCode, attempt };
      return;
    }

    logger.warn('Delivery attempt failed', {
      assignmentId: assignment._id,
      attempt,
      statusCode: result.statusCode,
      failureReason: result.failureReason,
    });

    if (attempt < maxRetries) await delay(attempt * config.delivery.initialDelayMs);
  }

  ctx.deliveryResult = { success: false, attempts: maxRetries };
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = deliver;
