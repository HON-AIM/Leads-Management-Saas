const { DeliveryProvider } = require('./provider');

const LOG_PREFIX = '[WebhookProvider]';

class WebhookProvider extends DeliveryProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'webhook';
    this.webhookUrl = config.webhookUrl || '';
    this.secret = config.secret || '';
    this.customHeaders = config.customHeaders || {};
  }

  validateConfig() {
    if (!this.webhookUrl) {
      throw new Error('Webhook provider requires webhookUrl');
    }
    return true;
  }

  async sendLead(lead, buyer) {
    const start = Date.now();
    const requestPayload = await DeliveryProvider.buildRequestPayload(lead, buyer);

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Lead-Source': 'lead-distribution-saas',
      'X-Lead-Id': lead._id?.toString() || '',
      'X-Lead-Email': lead.email || '',
      'X-Buyer-Id': buyer._id?.toString() || '',
      'X-Buyer-Name': buyer?.name || '',
      'X-Delivery-Timestamp': new Date().toISOString(),
      ...this.customHeaders,
    };

    if (this.secret) {
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', this.secret);
      hmac.update(JSON.stringify(requestPayload));
      headers['X-Webhook-Signature'] = hmac.digest('hex');
    }

    const response = await this._httpRequest(this.webhookUrl, 'POST', headers, requestPayload, this.timeout);
    return this._buildResult(response, start, requestPayload);
  }
}

module.exports = { WebhookProvider };
