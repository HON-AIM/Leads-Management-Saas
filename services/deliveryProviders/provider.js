const https = require('https');
const http = require('http');
const { URL } = require('url');

const LOG_PREFIX = '[DeliveryProvider]';

const HTTP_STATUS = {
  OK: { min: 200, max: 299 },
  REDIRECT: { min: 300, max: 399 },
  CLIENT_ERROR: { min: 400, max: 499 },
  SERVER_ERROR: { min: 500, max: 599 },
};

function isTransientError(statusCode, error) {
  if (statusCode >= 500) return true;
  if (statusCode === 429) return true;
  if (statusCode === 408) return true;
  if (!statusCode && error) {
    const msg = error.toLowerCase();
    if (msg.includes('timeout') || msg.includes('econnreset') || msg.includes('econnrefused') ||
        msg.includes('enotfound') || msg.includes('etimedout') || msg.includes('socket') ||
        msg.includes('network') || msg.includes('dns')) return true;
  }
  return false;
}

class DeliveryProvider {
  constructor(config = {}) {
    this.config = config;
    this.name = 'base';
    this.timeout = config.timeout || 30000;
  }

  async sendLead(lead, buyer) {
    throw new Error('sendLead() must be implemented by subclass');
  }

  validateConfig() {
    throw new Error('validateConfig() must be implemented by subclass');
  }

  static async buildRequestPayload(lead, buyer) {
    return {
      lead: {
        id: lead._id?.toString(),
        name: lead.name,
        email: lead.email,
        phone: lead.phone || '',
        state: lead.state,
        source: lead.source,
        campaign: lead.campaign || '',
        notes: lead.notes || '',
        status: lead.status,
        deliveryStatus: lead.deliveryStatus,
        createdAt: lead.createdAt?.toISOString(),
      },
      buyer: {
        id: buyer._id?.toString(),
        name: buyer.name,
        email: buyer.email,
        state: buyer.state,
      },
      metadata: {
        tracking: lead.trackingMetadata || {},
        enriched: lead.enrichedMetadata || {},
        custom: lead.metadata || {},
      },
      timestamp: new Date().toISOString(),
    };
  }

  async _httpRequest(url, method, headers, body, timeout) {
    const effectiveTimeout = timeout || this.timeout;

    return new Promise((resolve) => {
      try {
        const parsedUrl = new URL(url);
        const isHttps = parsedUrl.protocol === 'https:';
        const lib = isHttps ? https : http;
        const bodyStr = body ? JSON.stringify(body) : '';
        const port = parsedUrl.port || (isHttps ? 443 : 80);

        const options = {
          hostname: parsedUrl.hostname,
          port,
          path: parsedUrl.pathname + parsedUrl.search,
          method,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'LeadDistributionSaaS/1.0',
            ...headers,
            ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
          },
          timeout: effectiveTimeout,
        };

        const req = lib.request(options, (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            let parsed = null;
            try {
              parsed = JSON.parse(data);
            } catch {
              parsed = data || null;
            }
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: parsed,
              error: null,
            });
          });
          res.on('error', () => {});
        });

        req.on('error', (err) => {
          resolve({ statusCode: 0, body: null, error: err.message });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({ statusCode: 0, body: null, error: 'Request timeout' });
        });

        if (bodyStr) req.write(bodyStr);
        req.end();
      } catch (err) {
        resolve({ statusCode: 0, body: null, error: err.message });
      }
    });
  }

  _buildResult(response, start, requestPayload) {
    const duration = Date.now() - start;
    const statusCode = response.statusCode || 0;
    const isSuccess = statusCode >= 200 && statusCode < 300;
    const isTransient = isTransientError(statusCode, response.error);

    let error = null;
    if (!isSuccess) {
      if (response.error) {
        error = response.error;
      } else if (response.body && typeof response.body === 'object') {
        error = response.body.message || response.body.error || `HTTP ${statusCode}`;
      } else if (response.body) {
        error = `HTTP ${statusCode}: ${String(response.body).slice(0, 200)}`;
      } else {
        error = `HTTP ${statusCode}`;
      }
    }

    return {
      success: isSuccess,
      transient: isTransient,
      statusCode,
      responseBody: response.body,
      responseHeaders: response.headers,
      requestPayload,
      duration,
      error,
      attemptedAt: new Date().toISOString(),
    };
  }
}

function createProvider(providerName, config) {
  switch (providerName) {
    case 'ghl': {
      const { GHLProvider } = require('./ghlProvider');
      return new GHLProvider(config);
    }
    case 'webhook': {
      const { WebhookProvider } = require('./webhookProvider');
      return new WebhookProvider(config);
    }
    default:
      return null;
  }
}

module.exports = { DeliveryProvider, createProvider, isTransientError };
