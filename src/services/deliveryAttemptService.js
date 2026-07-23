const https = require('https');
const http = require('http');
const DeliveryAttempt = require('../models/DeliveryAttempt');
const LeadAssignment = require('../models/LeadAssignment');
const leadService = require('./leadService');
const payloadTemplateService = require('./payloadTemplateService');
const responseParsingService = require('./responseParsingService');
const logger = require('../utils/logger');

async function attemptDelivery({ leadAssignment, lead, buyer, campaign, supplier, triggeredBy = 'automatic', triggeredByUserId, tenantId }) {
  // Layer 6: Final guard — absolutely never send an outbound request for a duplicate lead
  if (lead.isDuplicate || lead.status === 'duplicate') {
    logger.warn('attemptDelivery called with duplicate lead — blocked', {
      leadId: lead._id, buyerId: buyer._id, triggeredBy,
    });
    return { success: false, statusCode: null, failureReason: 'Blocked: duplicate lead', durationMs: 0 };
  }

  const attemptNumber = (await DeliveryAttempt.countDocuments({ leadAssignmentId: leadAssignment._id })) + 1;

  let payloadSent;
  let payloadTemplate;
  try {
    payloadTemplate = buyer.delivery?.payloadTemplate || payloadTemplateService.DEFAULT_PAYLOAD_TEMPLATE;
    const resolved = payloadTemplateService.resolveTemplate(payloadTemplate, lead, buyer, { campaign, supplier });
    payloadSent = JSON.parse(resolved);
  } catch (err) {
    const durationMs = 0;
    await DeliveryAttempt.create({
      leadAssignmentId: leadAssignment._id, leadId: lead._id, buyerId: buyer._id,
      attemptNumber, payloadTemplate: payloadTemplate || '', payloadSent: {}, webhookUrl: buyer.delivery?.url || '',
      statusCode: null, responseBody: null, responseHeaders: null,
      success: false, failureReason: `Payload template error: ${err.message}`, durationMs,
      triggeredBy, triggeredByUserId, tenantId,
    });

    await LeadAssignment.findByIdAndUpdate(leadAssignment._id, { status: 'failed', failureReason: `Payload template error: ${err.message}` });
    await leadService.markFailed(lead._id, tenantId);

    return { success: false, statusCode: null, failureReason: `Payload template error: ${err.message}`, durationMs };
  }

  const startTime = Date.now();
  let statusCode, responseBody, responseHeaders, success, failureReason;

  try {
    const response = await post(buyer.delivery.url, payloadSent, {
      secret: buyer.delivery.secret,
      timeout: 30000,
    });

    statusCode = response.statusCode;
    responseBody = response.body;
    responseHeaders = response.headers;

    let parsedBody;
    try { parsedBody = JSON.parse(responseBody); } catch { parsedBody = responseBody; }

    const is2xx = statusCode >= 200 && statusCode < 300;
    if (!is2xx) {
      success = false;
      failureReason = `HTTP ${statusCode}`;
    } else {
      const rule = buyer.delivery?.acceptanceRule;
      const evaluation = responseParsingService.evaluateAcceptanceFromJson(responseBody, rule);
      success = evaluation.accepted;
      failureReason = evaluation.accepted ? null : evaluation.reason;
    }

    responseBody = parsedBody;
  } catch (err) {
    success = false;
    failureReason = err.message;
    responseBody = null;
    responseHeaders = null;
    statusCode = null;
  }

  const durationMs = Date.now() - startTime;

  await DeliveryAttempt.create({
    leadAssignmentId: leadAssignment._id, leadId: lead._id, buyerId: buyer._id,
    attemptNumber, payloadTemplate, payloadSent, webhookUrl: buyer.delivery.url,
    statusCode, responseBody, responseHeaders, success, failureReason, durationMs,
    triggeredBy, triggeredByUserId, tenantId,
  });

  await LeadAssignment.findByIdAndUpdate(leadAssignment._id, {
    status: success ? 'delivered' : 'failed',
    ...(success ? { deliveredAt: new Date() } : { failureReason }),
    responseData: responseBody ? { statusCode, body: responseBody } : undefined,
  });

  if (success) {
    await leadService.markDelivered(lead._id, tenantId);
  } else {
    await leadService.markFailed(lead._id, tenantId);
  }

  return { success, statusCode, failureReason, durationMs };
}

function post(url, body, { secret, timeout } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === 'https:' ? https : http;
    const data = JSON.stringify(body);

    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) };
    if (secret) headers['X-Webhook-Secret'] = secret;

    const req = transport.request(
      { hostname: parsed.hostname, port: parsed.port, path: parsed.pathname, method: 'POST', headers, timeout },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
      }
    );
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(data);
    req.end();
  });
}

module.exports = { attemptDelivery };
