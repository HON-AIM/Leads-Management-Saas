const { attemptDelivery } = require('../../services/deliveryAttemptService');
const DeliveryAttempt = require('../../models/DeliveryAttempt');
const leadAssignmentRepo = require('../../repositories/leadAssignmentRepository');
const Lead = require('../../models/Lead');
const config = require('../../config');
const logger = require('../../utils/logger');

async function deliver(ctx) {
  const { assignment, lead, selectedBuyer } = ctx;
  if (!assignment || !selectedBuyer) return;

  // Layer 5: Defensive guard — never deliver a duplicate lead
  if (lead.isDuplicate || lead.status === 'duplicate') {
    ctx.stop = true;
    ctx.stopReason = 'Duplicate lead rejected at delivery stage';
    return;
  }


  const buyer = selectedBuyer.buyer;

  if (!buyer.delivery || buyer.delivery.provider === 'none' || !buyer.delivery.url) {
    await DeliveryAttempt.create({
      leadAssignmentId: assignment._id,
      leadId: lead._id,
      buyerId: buyer._id,
      attemptNumber: 1,
      payloadSent: {},
      webhookUrl: '',
      statusCode: null,
      responseBody: null,
      responseHeaders: null,
      success: true,
      failureReason: 'No-op delivery: no webhook URL configured',
      durationMs: 0,
      triggeredBy: 'automatic',
      tenantId: lead.tenantId,
    });
    await leadAssignmentRepo.updateStatus(assignment._id, 'delivered', { deliveredAt: new Date() });
    await Lead.findByIdAndUpdate(lead._id, { status: 'delivered' });
    ctx.deliveryResult = { success: true, method: 'no-op' };
    return;
  }

  const maxRetries = config.delivery.maxRetries;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;

    const result = await attemptDelivery({
      leadAssignment: assignment,
      lead,
      buyer,
      campaign: ctx.campaign,
      supplier: ctx.supplier,
      triggeredBy: 'automatic',
      tenantId: lead.tenantId,
    });

    if (result.success) {
      await Lead.findByIdAndUpdate(lead._id, { status: 'delivered' });
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

  await Lead.findByIdAndUpdate(lead._id, { status: 'failed' });
  ctx.deliveryResult = { success: false, attempts: maxRetries };
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = deliver;
