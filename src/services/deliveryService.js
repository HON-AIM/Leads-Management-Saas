const https = require('https');
const http = require('http');
const leadAssignmentRepo = require('../repositories/leadAssignmentRepository');
const leadService = require('./leadService');
const logger = require('../utils/logger');

class DeliveryService {
  async deliver(assignment, lead, buyer) {
    if (!buyer.delivery || buyer.delivery.provider === 'none' || !buyer.delivery.url) {
      await leadAssignmentRepo.updateStatus(assignment._id, 'delivered', { deliveredAt: new Date() });
      await leadService.markDelivered(lead._id, lead.tenantId);
      return { success: true, method: 'no-op' };
    }

    const payload = this.buildPayload(lead, buyer);
    let attempt = 0;
    const maxRetries = 3;
    const timeout = 10000;

    while (attempt < maxRetries) {
      try {
        attempt++;
        const response = await this.post(buyer.delivery.url, payload, {
          secret: buyer.delivery.secret,
          timeout,
        });

        if (response.statusCode >= 200 && response.statusCode < 300) {
          await leadAssignmentRepo.updateStatus(assignment._id, 'delivered', { deliveredAt: new Date() });
          await leadService.markDelivered(lead._id, lead.tenantId);
          return { success: true, statusCode: response.statusCode, attempt };
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
    return {
      lead: {
        id: lead._id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        state: lead.state,
        source: lead.source,
        customFields: lead.customFields,
      },
      buyer: { id: buyer._id, name: buyer.name },
      timestamp: new Date().toISOString(),
    };
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
