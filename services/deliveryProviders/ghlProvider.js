const { DeliveryProvider } = require('./provider');

const LOG_PREFIX = '[GHLProvider]';

const GHL_API_BASE = 'https://rest.gohighlevel.com/v1';
const DEFAULT_TIMEOUT = 30000;

class GHLProvider extends DeliveryProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'ghl';
    this.apiKey = config.apiKey || process.env.GHL_API_KEY || '';
    this.locationId = config.locationId || process.env.GHL_LOCATION_ID || '';
    this.webhookUrl = config.webhookUrl || '';
  }

  validateConfig() {
    if (!this.webhookUrl && !this.apiKey) {
      throw new Error('GHL provider requires webhookUrl or apiKey');
    }
    return true;
  }

  async sendLead(lead, buyer) {
    const start = Date.now();
    const requestPayload = await this._buildGHLPayload(lead, buyer);
    const { url, headers } = this._buildRequestConfig();

    const response = await this._httpRequest(url, 'POST', headers, requestPayload, this.timeout);
    return this._buildResult(response, start, requestPayload);
  }

  async _buildGHLPayload(lead, buyer) {
    const nameParts = (lead.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const tags = [
      lead.source ? `source_${lead.source}` : '',
      `state_${lead.state}`,
      lead.campaign ? `campaign_${lead.campaign}` : '',
      `buyer_${buyer?.name?.replace(/\s+/g, '_').toLowerCase() || ''}`,
    ].filter(Boolean);

    const ghlPayload = {
      firstName,
      lastName,
      name: lead.name,
      email: lead.email,
      phone: lead.phone || '',
      address: { state: lead.state },
      source: lead.source || 'lead-distribution-saas',
      tags,
      customFields: [
        { key: 'lead_id', value: lead._id?.toString() || '' },
        { key: 'lead_source', value: lead.source || '' },
        { key: 'campaign', value: lead.campaign || '' },
        { key: 'buyer_name', value: buyer?.name || '' },
        { key: 'buyer_email', value: buyer?.email || '' },
        { key: 'notes', value: lead.notes || '' },
        { key: 'delivery_status', value: lead.deliveryStatus || '' },
      ],
      ...(lead.trackingMetadata || {}),
    };

    if (this.locationId) {
      ghlPayload.locationId = this.locationId;
    }

    return ghlPayload;
  }

  _buildRequestConfig() {
    if (this.webhookUrl) {
      return {
        url: this.webhookUrl,
        headers: {
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
          ...(this.config.customHeaders || {}),
        },
      };
    }

    return {
      url: `${GHL_API_BASE}/contacts/`,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(this.config.customHeaders || {}),
      },
    };
  }
}

module.exports = { GHLProvider };
