const logger = require('../utils/logger');

const DEFAULT_PAYLOAD_TEMPLATE = JSON.stringify({
  first_name: '{{first_name}}',
  last_name: '{{last_name}}',
  email: '{{email}}',
  phone: '{{phone}}',
  state: '{{state}}',
  source: '{{source}}',
  lead_id: '{{lead_id}}',
}, null, 2);

function flattenObject(obj, prefix = '') {
  const result = {};
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val === null || val === undefined) {
      result[fullKey] = '';
    } else if (Array.isArray(val)) {
      result[fullKey] = JSON.stringify(val);
    } else if (typeof val === 'object') {
      Object.assign(result, flattenObject(val, fullKey));
    } else {
      result[fullKey] = String(val);
    }
  }
  return result;
}

function jsonEscape(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function getSampleLead(buyerId, buyerName) {
  return {
    _id: '64f1a2b3c4d5e6f7a8b9c0d1',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '(555) 123-4567',
    state: 'TX',
    source: 'facebook',
    createdAt: new Date().toISOString(),
    buyerId: buyerId || '64f1a2b3c4d5e6f7a8b9c0d2',
    buyerName: buyerName || 'Sample Buyer',
    rawPayload: {
      motivation: 'buying first home',
      area_enfoque: 'residential',
      budget_range: '$300k-$500k',
      timeline: '3 months',
    },
  };
}

function getAvailableTokens(lead, buyer, context = {}) {
  const sample = lead || getSampleLead(buyer?._id, buyer?.name);
  const { campaign, supplier } = context;
  const tokens = [];

  const nameParts = (sample.name || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const standardTokens = [
    { token: 'first_name', label: 'First Name', value: firstName, source: 'standard' },
    { token: 'last_name', label: 'Last Name', value: lastName, source: 'standard' },
    { token: 'name', label: 'Full Name', value: sample.name || '', source: 'standard' },
    { token: 'email', label: 'Email', value: sample.email || '', source: 'standard' },
    { token: 'phone', label: 'Phone', value: sample.phone || '', source: 'standard' },
    { token: 'state', label: 'State', value: sample.state || '', source: 'standard' },
    { token: 'source', label: 'Source', value: sample.source || '', source: 'standard' },
    { token: 'lead_id', label: 'Lead ID', value: String(sample._id || ''), source: 'standard' },
    { token: 'created_at', label: 'Created At', value: sample.createdAt || new Date().toISOString(), source: 'standard' },
    { token: 'buyer_id', label: 'Buyer ID', value: String(sample.buyerId || buyer?._id || ''), source: 'standard' },
    { token: 'buyer_name', label: 'Buyer Name', value: sample.buyerName || buyer?.name || '', source: 'standard' },
  ];

  tokens.push(...standardTokens);

  const resolvedCampaign = campaign || resolveRef(sample.campaignId);
  const resolvedSupplier = supplier || resolveRef(sample.supplierId);

  if (resolvedCampaign) {
    tokens.push(
      { token: 'campaign_id', label: 'Campaign ID', value: String(resolvedCampaign._id || ''), source: 'campaign' },
      { token: 'campaign_name', label: 'Campaign Name', value: resolvedCampaign.name || '', source: 'campaign' },
      { token: 'campaign_routing_mode', label: 'Campaign Routing Mode', value: resolvedCampaign.routingMode || '', source: 'campaign' },
    );
  }

  if (resolvedSupplier) {
    tokens.push(
      { token: 'supplier_id', label: 'Supplier ID', value: String(resolvedSupplier._id || ''), source: 'supplier' },
      { token: 'supplier_name', label: 'Supplier Name', value: resolvedSupplier.name || '', source: 'supplier' },
      { token: 'supplier_type', label: 'Supplier Type', value: resolvedSupplier.type || '', source: 'supplier' },
      { token: 'supplier_key', label: 'Supplier Key', value: resolvedSupplier.supplierKey || '', source: 'supplier' },
    );
  }

  const now = new Date();
  tokens.push(
    { token: 'current_date', label: 'Current Date', value: now.toISOString().slice(0, 10), source: 'system' },
    { token: 'current_time', label: 'Current Time', value: now.toISOString().slice(11, 19), source: 'system' },
    { token: 'current_timestamp', label: 'Current Timestamp', value: now.toISOString(), source: 'system' },
  );

  const raw = sample.rawPayload || {};
  if (typeof raw === 'object' && raw !== null && Object.keys(raw).length > 0) {
    const flat = flattenObject(raw, 'raw');
    for (const [path, value] of Object.entries(flat)) {
      const label = path.split('.').pop().replace(/_/g, ' ');
      tokens.push({
        token: path,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        value,
        source: 'dynamic',
      });
    }
  }

  return tokens;
}

function resolveRef(ref) {
  if (!ref) return null;
  if (typeof ref === 'object' && ref._id) return ref;
  return null;
}

function resolveTemplate(templateString, lead, buyer, context = {}) {
  const tokens = getAvailableTokens(lead, buyer, context);
  const tokenMap = {};
  for (const t of tokens) {
    tokenMap[t.token] = jsonEscape(t.value);
  }

  return templateString.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, token) => {
    if (token in tokenMap) return tokenMap[token];
    return '';
  });
}

function validateTemplateSyntax(templateString) {
  let openCount = 0;
  let lastOpenPos = -1;

  for (let i = 0; i < templateString.length - 1; i++) {
    if (templateString[i] === '{' && templateString[i + 1] === '{') {
      openCount++;
      lastOpenPos = i;
      i++;
    } else if (templateString[i] === '}' && templateString[i + 1] === '}') {
      openCount--;
      if (openCount < 0) {
        return {
          valid: false,
          error: `Unexpected closing braces "}}" at position ${i}. Check for unmatched closing braces.`,
        };
      }
      i++;
    }
  }

  if (openCount !== 0) {
    return {
      valid: false,
      error: `Unbalanced braces: ${openCount} unclosed "{{" token(s) found. Last opened near position ${lastOpenPos}. Make sure every "{{field}}" has a matching closing "}}".`,
    };
  }

  return { valid: true, error: null };
}

function validateResolvedJson(resolvedString) {
  try {
    const parsed = JSON.parse(resolvedString);
    return { valid: true, parsed, error: null };
  } catch (err) {
    const position = err.message.match(/position\s+(\d+)/i);
    const pos = position ? ` at position ${position[1]}` : '';
    return {
      valid: false,
      parsed: null,
      error: `JSON parse error${pos}: ${err.message}. Check for a trailing comma before a closing } or ] — this is the most common cause of this error.`,
    };
  }
}

module.exports = {
  DEFAULT_PAYLOAD_TEMPLATE,
  flattenObject,
  getAvailableTokens,
  resolveTemplate,
  validateTemplateSyntax,
  validateResolvedJson,
  getSampleLead,
};
