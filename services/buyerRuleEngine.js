/**
 * Lead Distro-style buyer routing rule engine.
 * Evaluation order: geo → quality/custom filters → caps → schedule
 */

const OPERATORS = ['eq', 'ne', 'in', 'not_in', 'contains', 'gte', 'lte', 'exists', 'not_exists'];

function getLeadField(lead, field) {
  if (!field || !lead) return undefined;
  const key = field.trim();

  const direct = {
    state: lead.normalized_region_code || lead.state,
    country: lead.normalized_country_code || 'US',
    zip: lead.postal_code || lead.raw_postal || lead.metadata?.zip,
    postal_code: lead.postal_code || lead.raw_postal,
    email: lead.email,
    phone: lead.phone,
    name: lead.name,
    source: lead.source,
    campaign: lead.campaign,
    city: lead.normalized_city || lead.raw_city,
  };

  if (key in direct) return direct[key];

  if (key.startsWith('metadata.')) {
    return lead.metadata?.[key.slice(9)];
  }
  if (key.startsWith('tracking.')) {
    return lead.trackingMetadata?.[key.slice(9)];
  }
  if (key.startsWith('raw.')) {
    return lead.rawPayload?.[key.slice(4)];
  }

  return lead.metadata?.[key] ?? lead.rawPayload?.[key] ?? lead[key];
}

function normalizeZip(zip) {
  if (!zip) return null;
  const s = String(zip).trim();
  return s.slice(0, 5);
}

function evaluateCustomFilter(lead, filter) {
  const { field, operator, value } = filter;
  const actual = getLeadField(lead, field);
  const op = operator || 'eq';

  switch (op) {
    case 'exists':
      return actual != null && String(actual).trim() !== '';
    case 'not_exists':
      return actual == null || String(actual).trim() === '';
    case 'eq':
      return String(actual ?? '').toLowerCase() === String(value ?? '').toLowerCase();
    case 'ne':
      return String(actual ?? '').toLowerCase() !== String(value ?? '').toLowerCase();
    case 'in': {
      const list = Array.isArray(value) ? value : String(value || '').split(',').map((v) => v.trim());
      return list.map((v) => String(v).toLowerCase()).includes(String(actual ?? '').toLowerCase());
    }
    case 'not_in': {
      const list = Array.isArray(value) ? value : String(value || '').split(',').map((v) => v.trim());
      return !list.map((v) => String(v).toLowerCase()).includes(String(actual ?? '').toLowerCase());
    }
    case 'contains':
      return String(actual ?? '').toLowerCase().includes(String(value ?? '').toLowerCase());
    case 'gte':
      return Number(actual) >= Number(value);
    case 'lte':
      return Number(actual) <= Number(value);
    default:
      return true;
  }
}

function passesGeoRules(buyer, lead) {
  const leadState = (lead.normalized_region_code || lead.state || '').toUpperCase();
  const leadCountry = (lead.normalized_country_code || 'US').toUpperCase();
  const leadZip = normalizeZip(lead.postal_code || lead.raw_postal || getLeadField(lead, 'zip'));
  const rules = buyer.routingRules || {};

  const allowedCountries = (buyer.allowedCountries?.length ? buyer.allowedCountries : [buyer.country || 'US'])
    .map((c) => c.toUpperCase());
  if (!allowedCountries.includes(leadCountry)) {
    return { pass: false, reason: 'country_mismatch' };
  }

  const allowedStates = buyer.allowedStates?.length
    ? buyer.allowedStates.map((s) => s.toUpperCase())
    : (rules.allowedStates?.length ? rules.allowedStates.map((s) => s.toUpperCase()) : null);

  if (allowedStates?.length && !allowedStates.includes(leadState)) {
    return { pass: false, reason: 'state_mismatch' };
  }

  // Empty allowedStates = accept any state within allowed country (Lead Distro default)

  const allowedZips = (rules.allowedZips || []).map(normalizeZip).filter(Boolean);
  if (allowedZips.length > 0) {
    if (!leadZip || !allowedZips.includes(leadZip)) {
      return { pass: false, reason: 'zip_not_allowed' };
    }
  }

  const blockedZips = (rules.blockedZips || []).map(normalizeZip).filter(Boolean);
  if (leadZip && blockedZips.includes(leadZip)) {
    return { pass: false, reason: 'zip_blocked' };
  }

  return { pass: true };
}

function passesQualityRules(buyer, lead) {
  const rules = buyer.routingRules || {};

  const requiredFields = rules.requiredFields?.length
    ? rules.requiredFields
    : ['email'];

  for (const field of requiredFields) {
    const val = getLeadField(lead, field);
    if (val == null || String(val).trim() === '' || String(val).includes('unknown@')) {
      return { pass: false, reason: `missing_required_${field}` };
    }
  }

  const allowedSources = rules.allowedSources?.length ? rules.allowedSources : null;
  if (allowedSources && !allowedSources.map((s) => s.toLowerCase()).includes((lead.source || '').toLowerCase())) {
    return { pass: false, reason: 'source_not_allowed' };
  }

  const blockedSources = rules.blockedSources || [];
  if (blockedSources.map((s) => s.toLowerCase()).includes((lead.source || '').toLowerCase())) {
    return { pass: false, reason: 'source_blocked' };
  }

  const minScore = rules.minQualityScore ?? 0;
  if (minScore > 0) {
    const score = (lead.location_confidence_score ?? 0) * 100;
    if (score < minScore) {
      return { pass: false, reason: 'quality_score_too_low' };
    }
  }

  const customFilters = rules.customFilters || [];
  for (const filter of customFilters) {
    if (!filter.field) continue;
    if (!evaluateCustomFilter(lead, filter)) {
      return { pass: false, reason: `custom_filter_failed_${filter.field}` };
    }
  }

  return { pass: true };
}

function evaluateBuyerRules(buyer, lead) {
  const geo = passesGeoRules(buyer, lead);
  if (!geo.pass) return { eligible: false, reason: geo.reason, stage: 'geo' };

  const quality = passesQualityRules(buyer, lead);
  if (!quality.pass) return { eligible: false, reason: quality.reason, stage: 'quality' };

  return { eligible: true, reason: null, stage: 'passed' };
}

function auditBuyerRules(buyer, lead) {
  const results = [];
  const geo = passesGeoRules(buyer, lead);
  results.push({ stage: 'geo', pass: geo.pass, reason: geo.reason || 'ok' });

  const quality = passesQualityRules(buyer, lead);
  results.push({ stage: 'quality', pass: quality.pass, reason: quality.reason || 'ok' });

  return {
    buyerId: buyer._id,
    buyerName: buyer.name,
    eligible: geo.pass && quality.pass,
    stages: results,
  };
}

module.exports = {
  OPERATORS,
  getLeadField,
  evaluateBuyerRules,
  auditBuyerRules,
  passesGeoRules,
  passesQualityRules,
  evaluateCustomFilter,
};
