const logger = require('../utils/logger');

const VARIABLE_REGISTRY = {
  standard: [
    { token: 'first_name', label: 'First Name', source: 'lead', getter: (lead) => (lead.name || '').split(' ')[0] || '' },
    { token: 'last_name', label: 'Last Name', source: 'lead', getter: (lead) => (lead.name || '').split(' ').slice(1).join(' ') || '' },
    { token: 'name', label: 'Full Name', source: 'lead', getter: (lead) => lead.name || '' },
    { token: 'email', label: 'Email', source: 'lead', getter: (lead) => lead.email || '' },
    { token: 'phone', label: 'Phone', source: 'lead', getter: (lead) => lead.phone || '' },
    { token: 'state', label: 'State', source: 'lead', getter: (lead) => lead.state || '' },
    { token: 'source', label: 'Source', source: 'lead', getter: (lead) => lead.source || '' },
    { token: 'lead_id', label: 'Lead ID', source: 'lead', getter: (lead) => String(lead._id || '') },
    { token: 'created_at', label: 'Created At', source: 'lead', getter: (lead) => lead.createdAt || new Date().toISOString() },
  ],
  buyer: [
    { token: 'buyer_id', label: 'Buyer ID', source: 'buyer', getter: (_lead, buyer) => String(buyer?._id || '') },
    { token: 'buyer_name', label: 'Buyer Name', source: 'buyer', getter: (_lead, buyer) => buyer?.name || '' },
    { token: 'ghl_user_id', label: 'GHL User ID', source: 'buyer', getter: (_lead, buyer) => buyer?.ghlUserId || '' },
  ],
  campaign: [
    { token: 'campaign_id', label: 'Campaign ID', source: 'campaign', getter: (_lead, _buyer, ctx) => String(ctx.campaign?._id || '') },
    { token: 'campaign_name', label: 'Campaign Name', source: 'campaign', getter: (_lead, _buyer, ctx) => ctx.campaign?.name || '' },
    { token: 'campaign_routing_mode', label: 'Campaign Routing Mode', source: 'campaign', getter: (_lead, _buyer, ctx) => ctx.campaign?.routingMode || '' },
  ],
  supplier: [
    { token: 'supplier_id', label: 'Supplier ID', source: 'supplier', getter: (_lead, _buyer, ctx) => String(ctx.supplier?._id || '') },
    { token: 'supplier_name', label: 'Supplier Name', source: 'supplier', getter: (_lead, _buyer, ctx) => ctx.supplier?.name || '' },
    { token: 'supplier_type', label: 'Supplier Type', source: 'supplier', getter: (_lead, _buyer, ctx) => ctx.supplier?.type || '' },
    { token: 'supplier_key', label: 'Supplier Key', source: 'supplier', getter: (_lead, _buyer, ctx) => ctx.supplier?.supplierKey || '' },
  ],
  system: [
    { token: 'current_date', label: 'Current Date', source: 'system', getter: () => new Date().toISOString().slice(0, 10) },
    { token: 'current_time', label: 'Current Time', source: 'system', getter: () => new Date().toISOString().slice(11, 19) },
    { token: 'current_timestamp', label: 'Current Timestamp', source: 'system', getter: () => new Date().toISOString() },
  ],
};

const DEFAULT_PAYLOAD_TEMPLATE = JSON.stringify({
  first_name: '{{first_name}}',
  last_name: '{{last_name}}',
  email: '{{email}}',
  phone: '{{phone}}',
  state: '{{state}}',
  source: '{{source}}',
  lead_id: '{{lead_id}}',
  assigned_user_id: '{{ghl_user_id}}',
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

function getPreviewLead(buyerId, buyerName) {
  return {
    _id: '',
    name: '',
    email: '',
    phone: '',
    state: '',
    source: '',
    createdAt: new Date().toISOString(),
    buyerId: buyerId || '',
    buyerName: buyerName || '',
    rawPayload: {},
  };
}

function getAvailableTokens(lead, buyer, context = {}) {
  const sample = lead || getPreviewLead(buyer?._id, buyer?.name);
  const { campaign, supplier } = context;
  const ctx = { campaign, supplier };
  const tokens = [];

  for (const def of VARIABLE_REGISTRY.standard) {
    tokens.push({ token: def.token, label: def.label, value: def.getter(sample, buyer, ctx), source: def.source });
  }
  for (const def of VARIABLE_REGISTRY.buyer) {
    tokens.push({ token: def.token, label: def.label, value: def.getter(sample, buyer, ctx), source: def.source });
  }
  if (campaign) {
    for (const def of VARIABLE_REGISTRY.campaign) {
      tokens.push({ token: def.token, label: def.label, value: def.getter(sample, buyer, ctx), source: def.source });
    }
  }
  if (supplier) {
    for (const def of VARIABLE_REGISTRY.supplier) {
      tokens.push({ token: def.token, label: def.label, value: def.getter(sample, buyer, ctx), source: def.source });
    }
  }
  for (const def of VARIABLE_REGISTRY.system) {
    tokens.push({ token: def.token, label: def.label, value: def.getter(sample, buyer, ctx), source: def.source });
  }

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
  VARIABLE_REGISTRY,
  DEFAULT_PAYLOAD_TEMPLATE,
  flattenObject,
  getAvailableTokens,
  resolveTemplate,
  validateTemplateSyntax,
  validateResolvedJson,
  getPreviewLead,
};
