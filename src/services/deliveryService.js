const config = require('../config');
const https = require('https');
const http = require('http');
const leadAssignmentRepo = require('../repositories/leadAssignmentRepository');
const leadService = require('./leadService');
const payloadTemplateService = require('./payloadTemplateService');
const responseParsingService = require('./responseParsingService');
const logger = require('../utils/logger');

class DeliveryService {
  async deliver(assignment, lead, buyer) {
    if (!buyer.delivery || buyer.delivery.provider === 'none' || !buyer.delivery.url) {
      await leadAssignmentRepo.updateStatus(assignment._id, 'delivered', { deliveredAt: new Date() });
      await leadService.markDelivered(lead._id, lead.tenantId);
      return { success: true, method: 'no-op' };
    }

    let payload;
    try {
      payload = this.buildPayload(lead, buyer);
    } catch (err) {
      await leadAssignmentRepo.updateStatus(assignment._id, 'failed', { failureReason: err.message });
      await leadService.markFailed(lead._id, lead.tenantId);
      return { success: false, error: err.message };
    }
    let attempt = 0;
    const maxRetries = config.delivery.maxRetries;
    const timeout = config.delivery.timeoutMs;

    while (attempt < maxRetries) {
      try {
        attempt++;
        const response = await this.post(buyer.delivery.url, payload, {
          secret: buyer.delivery.secret,
          timeout,
        });

        if (response.statusCode >= 200 && response.statusCode < 300) {
          const rule = buyer.delivery?.acceptanceRule;
          const acceptance = responseParsingService.evaluateAcceptanceFromJson(response.body, rule);

          const assignmentUpdate = {
            deliveredAt: new Date(),
            responseData: (() => { try { return JSON.parse(response.body); } catch { return { raw: response.body }; } })(),
          };

          if (acceptance.accepted) {
            await leadAssignmentRepo.updateStatus(assignment._id, 'delivered', assignmentUpdate);
            await leadService.markDelivered(lead._id, lead.tenantId);
            return { success: true, statusCode: response.statusCode, attempt, accepted: true, acceptanceReason: acceptance.reason };
          }

          logger.warn('Delivery rejected by acceptance rule', {
            assignmentId: assignment._id,
            statusCode: response.statusCode,
            reason: acceptance.reason,
            attempt,
          });
          continue;
        }

        logger.warn('Delivery failed', {
          assignmentId: assignment._id,
          statusCode: response.statusCode,
          attempt,
          body: response.body?.slice(0, 200),
        });
      } catch (err) {
        logger.warn('Delivery error', { assignmentId: assignment._id, error: err.message, attempt });
      }

      if (attempt < maxRetries) await this.delay(attempt * 1000);
    }

    await leadAssignmentRepo.updateStatus(assignment._id, 'failed', { failureReason: `Failed after ${maxRetries} attempts` });
    await leadService.markFailed(lead._id, lead.tenantId);
    return { success: false, attempts: maxRetries };
  }

  buildPayload(lead, buyer) {
    const template = buyer.delivery?.payloadTemplate || payloadTemplateService.DEFAULT_PAYLOAD_TEMPLATE;
    const resolved = payloadTemplateService.resolveTemplate(template, lead, buyer);
    try {
      return JSON.parse(resolved);
    } catch (err) {
      logger.error('Invalid resolved payload template', {
        buyerId: buyer._id,
        buyerName: buyer.name,
        error: err.message,
      });
      throw new Error('Invalid payload template — resolved output is not valid JSON');
    }
  }

  post(url, body, { secret, timeout } = {}) {
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

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new DeliveryService();
