const { detectCountry, resolveExplicitCountry } = require('./countryDetector');
const { resolveCountryFromPhone } = require('./phoneCountryResolver');
const { normalizeRegion } = require('./regionNormalizer');
const { matchAlias, learnAlias } = require('./aliasMatcher');
const { calculateConfidence, isRoutable } = require('./confidenceScorer');
const { resolvePostalCode, extractPostalCode } = require('./postalCodeResolver');
const { fallbackResolve } = require('./geoFallbackService');
const { matchTerritory } = require('./territoryMatcher');

const LOG_PREFIX = '[LocationIntelligence]';

function log(step, details = {}) {
  const ts = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${ts} | Step: ${step}`, details);
}

async function normalizeLocation(payload, options = {}) {
  const pipelineStart = Date.now();
  const detectionMethods = [];
  const detectionDetails = {};

  log('NORMALIZE_START', { hasState: !!payload.state, hasPhone: !!payload.phone, hasCountry: !!payload.country });

  const raw_country = payload.country || payload.countryCode || payload.country_code || null;
  const raw_state = payload.state || payload.region || payload.province || payload.stateProvince || null;
  const raw_city = payload.city || payload.city_name || payload.town || null;
  const raw_phone = payload.phone || payload.phone_number || payload.telephone || null;
  const raw_postal = payload.postal_code || payload.zip || payload.zipCode || payload.postalCode || payload.postcode || null;
  const raw_address = payload.address || payload.street || null;

  // ── Step 1: Phone Detection ──────────────────────────────────────────────
  let phoneResult = null;
  if (raw_phone) {
    phoneResult = resolveCountryFromPhone(raw_phone);
    if (phoneResult) {
      detectionMethods.push('phone_detection');
      detectionDetails.phone = phoneResult;
      log('PHONE_DETECTED', { country: phoneResult.country_code, valid: phoneResult.is_valid });
    }
  }

  // ── Step 2: Country Detection ────────────────────────────────────────────
  const countryResult = await detectCountry({
    country: raw_country,
    phone: raw_phone,
    state: raw_state,
    region: raw_state,
    postal_code: raw_postal,
  });

  if (countryResult.detection_methods) {
    for (const m of countryResult.detection_methods) {
      if (!detectionMethods.includes(m)) detectionMethods.push(m);
    }
  }
  detectionDetails.country = countryResult;

  const countryCode = countryResult.country_code;
  const countryAmbiguous = countryResult.ambiguous;

  log('COUNTRY_RESULT', { countryCode, ambiguous: countryAmbiguous, confidence: countryResult.confidence });

  // ── Step 3: Region Normalization ─────────────────────────────────────────
  let regionResult = null;
  if (raw_state) {
    regionResult = await normalizeRegion(raw_state, countryCode);
    if (regionResult) {
      if (!detectionMethods.includes('region_match')) detectionMethods.push('region_match');
      if (regionResult.match_type && regionResult.match_type.includes('alias') && !detectionMethods.includes('alias_match')) {
        detectionMethods.push('alias_match');
      }
      if (regionResult.match_type && regionResult.match_type.includes('fuzzy') && !detectionMethods.includes('fuzzy_match')) {
        detectionMethods.push('fuzzy_match');
      }
      detectionDetails.region = regionResult;

      if (regionResult.confidence >= 0.9 && raw_state && countryCode) {
        learnAlias(countryCode, raw_state, regionResult.normalized_code, regionResult.confidence).catch(() => {});
      }
    }
  }

  // ── Step 4: Postal Code Resolution ───────────────────────────────────────
  let postalResult = null;
  const postalInput = raw_postal || (raw_address ? extractPostalCode(raw_address) : null);
  if (postalInput) {
    postalResult = resolvePostalCode(postalInput, countryCode);
    if (postalResult && !detectionMethods.includes('postal_match')) {
      detectionMethods.push('postal_match');
    }
    detectionDetails.postal = postalResult;
  }

  // ── Step 5: Fallback Resolution ──────────────────────────────────────────
  let fallbackResult = null;
  if (!countryCode || (!regionResult && raw_state)) {
    fallbackResult = await fallbackResolve(raw_state || raw_country || raw_city);
    if (fallbackResult?.success) {
      if (!detectionMethods.includes('fallback')) detectionMethods.push('fallback');
      detectionDetails.fallback = fallbackResult;
      log('FALLBACK_USED', { result: fallbackResult.result });
    }
  }

  // ── Step 6: Confidence Scoring ───────────────────────────────────────────
  const confidenceResult = calculateConfidence({
    phoneMatch: phoneResult,
    countryMatch: countryResult,
    regionMatch: regionResult,
    postalMatch: postalResult,
    territoryMatch: null,
    detectionMethods,
  });

  // ── Step 7: Territory Matching (tenant-specific) ─────────────────────────
  let territoryResult = null;
  if (options.tenantId && countryCode) {
    const geoForTerritory = {
      normalized_country_code: countryCode,
      normalized_region_code: regionResult?.normalized_code || null,
      normalized_city: raw_city,
      postal_code: postalResult?.postal_code || null,
    };
    territoryResult = await matchTerritory(options.tenantId, geoForTerritory);
    if (territoryResult) {
      if (detectionMethods.includes('territory_match') === false) detectionMethods.push('territory_match');
      detectionDetails.territory = territoryResult;
    }
  }

  // ── Assemble Result ──────────────────────────────────────────────────────
  const pipelineDuration = Date.now() - pipelineStart;

  const result = {
    raw_country: raw_country,
    raw_state: raw_state,
    raw_city: raw_city,
    raw_phone: raw_phone,
    raw_postal: raw_postal,

    normalized_country_code: countryCode,
    normalized_country_iso3: countryResult.country_iso3 || null,
    normalized_region_code: regionResult?.normalized_code || null,
    normalized_region_name: regionResult?.normalized_name || null,
    normalized_city: raw_city || null,
    postal_code: postalResult?.postal_code || raw_postal || null,
    phone_country_code: phoneResult?.country_code || null,

    normalized_country_name: phoneResult?.country_name || null,
    phone_type: phoneResult?.phone_type || null,
    phone_valid: phoneResult?.is_valid || null,

    country_ambiguous: countryAmbiguous,
    possible_countries: countryResult.possible_countries || [],

    confidence_score: confidenceResult.score,
    confidence_level: confidenceResult.level,
    routable: isRoutable(confidenceResult.score, options.confidenceThreshold || 0.5),

    territory_match: territoryResult ? {
      territory_id: territoryResult.territory._id,
      territory_name: territoryResult.territory.name,
      match_score: territoryResult.score,
      match_reasons: territoryResult.matchReasons,
    } : null,

    detection_methods: detectionMethods,
    detection_details: detectionDetails,

    fallback_used: !!fallbackResult?.success,
    pipeline_duration_ms: pipelineDuration,
    enriched_at: new Date().toISOString(),
  };

  log('NORMALIZE_COMPLETE', {
    country: result.normalized_country_code,
    region: result.normalized_region_code,
    confidence: result.confidence_score,
    methods: detectionMethods.length,
    duration: pipelineDuration,
  });

  return result;
}

async function enrichLeadWithLocation(lead, tenantId) {
  if (!lead) return null;

  const payload = {
    country: lead.rawPayload?.country || lead.metadata?.country || null,
    state: lead.state || lead.rawPayload?.state || lead.metadata?.state || lead.enrichedMetadata?.state || null,
    city: lead.rawPayload?.city || lead.metadata?.city || null,
    phone: lead.phone || lead.rawPayload?.phone || null,
    postal_code: lead.rawPayload?.postal_code || lead.rawPayload?.zip || lead.metadata?.zip || null,
    address: lead.rawPayload?.address || lead.metadata?.address || null,
  };

  const geoResult = await normalizeLocation(payload, { tenantId });

  return geoResult;
}

async function normalizeBulk(payloads, options = {}) {
  const results = [];
  for (const p of payloads) {
    try {
      const result = await normalizeLocation(p, options);
      results.push({ input: p, success: true, result });
    } catch (err) {
      results.push({ input: p, success: false, error: err.message });
    }
  }
  return results;
}

module.exports = { normalizeLocation, enrichLeadWithLocation, normalizeBulk, calculateConfidence };
