const Country = require('../../../models/Country');
const Region = require('../../../models/Region');

async function fallbackResolve(input) {
  if (!input) return null;

  const cleaned = input.toString().trim();
  if (!cleaned) return null;

  const result = {
    original_input: cleaned,
    attempts: [],
    success: false,
    result: null,
  };

  const countryAttempt = await tryCountryMatch(cleaned);
  result.attempts.push({ method: 'country_lookup', success: !!countryAttempt });
  if (countryAttempt) {
    result.success = true;
    result.result = {
      type: 'country',
      country_code: countryAttempt.iso2,
      confidence: 0.4,
      source: 'fallback',
    };
    return result;
  }

  const regionAttempt = await tryRegionMatch(cleaned);
  result.attempts.push({ method: 'region_lookup', success: !!regionAttempt });
  if (regionAttempt) {
    result.success = true;
    result.result = {
      type: 'region',
      country_code: regionAttempt.country_iso2,
      region_code: regionAttempt.code,
      confidence: 0.35,
      source: 'fallback',
    };
    return result;
  }

  const phoneticResult = phoneticFallback(cleaned);
  result.attempts.push({ method: 'phonetic', success: !!phoneticResult });
  if (phoneticResult) {
    result.success = true;
    result.result = { type: 'phonetic', ...phoneticResult, confidence: 0.25, source: 'fallback' };
    return result;
  }

  result.attempts.push({ method: 'exhausted', success: false });
  result.result = { type: 'unknown', confidence: 0, source: 'fallback' };
  return result;
}

async function tryCountryMatch(input) {
  const countries = await Country.find({ active: true }).lean();
  const lower = input.toLowerCase();

  for (const c of countries) {
    if (c.name.toLowerCase() === lower) return c;
    if (c.iso2.toLowerCase() === lower) return c;
    if (c.iso3.toLowerCase() === lower) return c;
    if (c.aliases && c.aliases.includes(lower)) return c;
  }

  for (const c of countries) {
    if (c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase())) {
      return c;
    }
  }
  return null;
}

async function tryRegionMatch(input) {
  const lower = input.toLowerCase();
  const regions = await Region.find({ active: true }).lean();
  for (const r of regions) {
    if (r.name.toLowerCase() === lower) return r;
    if (r.code.toLowerCase() === lower) return r;
    if (r.aliases && r.aliases.includes(lower)) return r;
  }
  for (const r of regions) {
    if (r.name.toLowerCase().includes(lower)) return r;
  }
  return null;
}

function phoneticFallback(input) {
  const lower = input.toLowerCase().replace(/[^a-z\s]/g, '').trim();

  const phoneticMap = [
    { from: ['kali'], to: 'California', country_iso2: 'US', region_code: 'CA' },
    { from: ['phila', 'filadelfia'], to: 'Pennsylvania', country_iso2: 'US', region_code: 'PA' },
    { from: ['mass', 'massachussets', 'massachussetts'], to: 'Massachusetts', country_iso2: 'US', region_code: 'MA' },
    { from: ['misisipi', 'missippi'], to: 'Mississippi', country_iso2: 'US', region_code: 'MS' },
    { from: ['conn', 'connecticutt'], to: 'Connecticut', country_iso2: 'US', region_code: 'CT' },
    { from: ['lagos', 'legos'], to: 'Lagos', country_iso2: 'NG', region_code: 'LA' },
    { from: ['abuja', 'abudja'], to: 'Abuja FCT', country_iso2: 'NG', region_code: 'FC' },
    { from: ['ont', 'ontario'], to: 'Ontario', country_iso2: 'CA', region_code: 'ON' },
    { from: ['quebec', 'québec'], to: 'Quebec', country_iso2: 'CA', region_code: 'QC' },
    { from: ['british columbia', 'b.c.'], to: 'British Columbia', country_iso2: 'CA', region_code: 'BC' },
    { from: ['nsw', 'new south wales'], to: 'New South Wales', country_iso2: 'AU', region_code: 'NSW' },
    { from: ['vic', 'victoria au'], to: 'Victoria', country_iso2: 'AU', region_code: 'VIC' },
    { from: ['qld', 'queensland'], to: 'Queensland', country_iso2: 'AU', region_code: 'QLD' },
    { from: ['england', 'eng'], to: 'England', country_iso2: 'GB', region_code: 'ENG' },
    { from: ['scotland', 'sct'], to: 'Scotland', country_iso2: 'GB', region_code: 'SCT' },
    { from: ['mumbai', 'bombay'], to: 'Maharashtra', country_iso2: 'IN', region_code: 'MH' },
    { from: ['bangalore', 'bengaluru'], to: 'Karnataka', country_iso2: 'IN', region_code: 'KA' },
    { from: ['bayern', 'bavaria'], to: 'Bavaria', country_iso2: 'DE', region_code: 'BY' },
  ];

  for (const entry of phoneticMap) {
    if (entry.from.includes(lower)) {
      return { country_iso2: entry.country_iso2, region_code: entry.region_code, resolved_name: entry.to };
    }
  }

  for (const entry of phoneticMap) {
    for (const variant of entry.from) {
      if (lower.includes(variant) || variant.includes(lower)) {
        return { country_iso2: entry.country_iso2, region_code: entry.region_code, resolved_name: entry.to };
      }
    }
  }

  return null;
}

module.exports = { fallbackResolve };
