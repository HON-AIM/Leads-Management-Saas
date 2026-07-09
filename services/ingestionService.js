const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const { normalizeState: normalizeUsState } = require('./stateNormalizer');
const {
  findDuplicate,
  buildDuplicateLeadData,
  applyNormalizedFields,
  resolveDedupWindowHours,
  normalizeEmailForDedup,
  normalizePhoneForDedup,
} = require('./deduplicationService');

const LOG_PREFIX = '[IngestionService]';

const FIELD_ALIASES = {
  name: ['name', 'full_name', 'fullName', 'firstName', 'first_name', 'lastName', 'last_name', 'contact_name', 'contactName', 'lead_name', 'contact.name'],
  email: ['email', 'email_address', 'emailAddress', 'contact_email', 'contactEmail', 'email_addr', 'emailAddr', 'contact.email'],
  phone: ['phone', 'phone_number', 'phoneNumber', 'contact_phone', 'contactPhone', 'telephone', 'tel', 'phone_num', 'contact.phone'],
  state: ['state', 'state_province', 'stateProvince', 'location_state', 'locationState', 'location.state', 'address.state', 'addressState', 'contact.state'],
  country: ['country', 'country_code', 'countryCode', 'country_name', 'countryName', 'location.country', 'address.country'],
  city: ['city', 'city_name', 'cityName', 'town', 'location.city', 'address.city', 'contact.city'],
  postal_code: ['postal_code', 'postalCode', 'zip', 'zipCode', 'zip_code', 'postcode', 'location.zip', 'address.zip'],
  address: ['address', 'street', 'street_address', 'streetAddress', 'location.address', 'contact.address'],
};

function log(step, details = {}) {
  const ts = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${ts} | Step: ${step}`, details);
}

function resolveAlias(body, aliases) {
  for (const key of aliases) {
    if (key.includes('.')) {
      const parts = key.split('.');
      let val = body;
      for (const part of parts) {
        if (val && typeof val === 'object' && part in val) {
          val = val[part];
        } else {
          val = undefined;
          break;
        }
      }
      if (val !== undefined && val !== null && val !== '') return String(val).trim();
    } else {
      const val = body[key];
      if (val !== undefined && val !== null && val !== '') return String(val).trim();
    }
  }
  return null;
}

function normalizeFieldNames(body) {
  const normalized = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    normalized[field] = resolveAlias(body, aliases);
  }
  return {
    ...normalized,
    source: body.source || null,
    campaign: body.campaign || null,
    notes: body.notes || null,
    tracking: body.tracking || body.trackingMetadata || null,
    metadata: body.metadata || null,
    rawPayload: body,
  };
}

function normalizeState(state) {
  return normalizeUsState(state);
}

function sanitizeInputs(fields) {
  const sanitized = {};

  if (fields.name) {
    sanitized.name = fields.name.replace(/<[^>]*>/g, '').trim().slice(0, 500);
  }

  if (fields.email) {
    sanitized.email = normalizeEmailForDedup(fields.email) || fields.email.trim().toLowerCase();
  }

  if (fields.phone) {
    sanitized.phone = fields.phone.replace(/[^\d+]/g, '').slice(0, 20);
  }

  return sanitized;
}

async function checkDuplicate(email, phone, tenantId, windowHours = 720, options = {}) {
  return findDuplicate({
    email,
    phone,
    tenantId,
    windowHours,
    excludeLeadId: options.excludeLeadId,
  });
}

function buildTrackingMetadata(body) {
  const tracking = body.tracking || body.trackingMetadata || {};

  return {
    utmSource: tracking.utmSource || tracking.utm_source || null,
    utmMedium: tracking.utmMedium || tracking.utm_medium || null,
    utmCampaign: tracking.utmCampaign || tracking.utm_campaign || null,
    utmTerm: tracking.utmTerm || tracking.utm_term || null,
    utmContent: tracking.utmContent || tracking.utm_content || null,
    fbclid: tracking.fbclid || null,
    gclid: tracking.gclid || null,
    referrer: tracking.referrer || tracking.referer || null,
    landingPage: tracking.landingPage || tracking.landing_page || tracking.pageUrl || null,
    userAgent: tracking.userAgent || tracking.user_agent || null,
    ipAddress: tracking.ipAddress || tracking.ip_address || null,
    formId: tracking.formId || tracking.form_id || null,
    adId: tracking.adId || tracking.ad_id || null,
    adSetId: tracking.adSetId || tracking.ad_set_id || null,
    campaignId: tracking.campaignId || tracking.campaign_id || null,
  };
}

async function createLeadRecord({
  name, email, phone, state, source, campaign, notes,
  rawPayload, trackingMetadata, enrichedMetadata, metadata,
  tenantId, country, city, postal_code,
}) {
  const leadData = {
    name: name || 'Unknown',
    email: email || 'unknown@lead.local',
    phone: phone || undefined,
    state: state || 'UNKNOWN',
    normalized_country_code: country || 'US',
    normalized_region_code: state || undefined,
    normalized_city: city,
    postal_code,
    source: source || 'api',
    campaign: campaign || undefined,
    notes: notes || undefined,
    rawPayload: rawPayload || {},
    trackingMetadata: trackingMetadata || {},
    enrichedMetadata: enrichedMetadata || {},
    metadata: metadata || {},
    tenantId,
    ingestionStatus: 'received',
    status: 'pending',
    deliveryStatus: 'pending',
  };

  return Lead.create(leadData);
}

async function ingestLead(body, tenantId, options = {}) {
  const ingestLog = (step, status, details = {}) => {
    log(step, { ...details, tenantId });
  };

  ingestLog('INGEST_START', 'PROCESSING', { source: body.source });

  const dedupWindowHours = options.dedupWindowHours || 24;

  const normalized = normalizeFieldNames(body);
  let { name, email, phone, state, source, campaign, notes, tracking, metadata, country, city, postal_code, address, rawPayload } = normalized;

  const sanitized = sanitizeInputs({ name, email, phone });
  name = sanitized.name || name;
  email = sanitized.email || email;
  phone = sanitized.phone || phone;

  if (!name || (!email && !phone)) {
    ingestLog('VALIDATION_FAILED', 'REJECTED', { hasName: !!name, hasEmail: !!email, hasPhone: !!phone });
    return { success: false, statusCode: 400, error: 'Name and at least one contact method (email or phone) required' };
  }

  // Simple state normalization (Lead Distro-style — no heavy geo pipeline)
  const resolvedState = normalizeUsState(state) || (state ? String(state).trim().toUpperCase().slice(0, 2) : 'UNKNOWN');
  const resolvedCountry = (country || 'US').toUpperCase().slice(0, 2);

  const duplicate = await checkDuplicate(email, phone, tenantId, dedupWindowHours);
  if (duplicate) {
    ingestLog('DUPLICATE_FOUND', 'DUPLICATE', { email, phone, duplicateOf: duplicate.duplicateOf, reason: duplicate.reason });

    const dupLead = await Lead.create({
      name, email, phone, state: resolvedState, source: source || 'api',
      campaign: campaign || undefined, notes: notes || undefined,
      rawPayload: body,
      trackingMetadata: buildTrackingMetadata(body),
      metadata: metadata || {},
      tenantId,
      ingestionStatus: 'duplicate',
      status: 'pending',
      deliveryStatus: 'pending',
      duplicateOf: duplicate.duplicateOf,
      duplicateReason: duplicate.reason,
    });

    return {
      success: true,
      statusCode: 200,
      lead: dupLead,
      duplicate: true,
      duplicateOf: duplicate.duplicateOf,
      duplicateReason: duplicate.reason,
    };
  }

  const trackingMetadata = buildTrackingMetadata(body);
  const enrichedMetadata = {
    resolvedState,
    resolvedCountry,
    sanitizedName: name,
    sanitizedEmail: email,
    sanitizedPhone: phone,
    receivedAt: new Date().toISOString(),
  };

  const lead = await createLeadRecord({
    name,
    email,
    phone,
    state: resolvedState,
    source: source || 'api',
    campaign,
    notes,
    rawPayload: body,
    trackingMetadata,
    enrichedMetadata,
    metadata: metadata || {},
    tenantId,
    country: resolvedCountry,
    city: city || undefined,
    postal_code: postal_code || undefined,
  });

  try {
    const { resolveCampaign } = require('./campaignResolver');
    const matchedCampaign = await resolveCampaign(lead, tenantId);
    if (matchedCampaign) {
      lead.campaignId = matchedCampaign._id;
      lead.campaign = matchedCampaign.name;
      lead.cost = matchedCampaign.costPerLead || 0;
      await lead.save();
    }
  } catch (campErr) {
    ingestLog('CAMPAIGN_MATCH_WARN', { error: campErr.message });
  }

  ingestLog('LEAD_CREATED', 'OK', { leadId: lead._id, source: lead.source, state: resolvedState });

  return {
    success: true,
    statusCode: 201,
    lead,
    duplicate: false,
    duplicateOf: null,
    duplicateReason: null,
  };
}

module.exports = {
  ingestLead,
  normalizeFieldNames,
  normalizeState,
  sanitizeInputs,
  checkDuplicate,
};
