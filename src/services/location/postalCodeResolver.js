const ZIP_COUNTRY_MAP = buildZipCountryMap();

function buildZipCountryMap() {
  const map = {};
  const usRanges = [
    { min: '01000', max: '99999', countries: ['US', 'PR', 'VI', 'GU', 'AS', 'MP'] },
  ];
  const caPattern = { regex: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i, countries: ['CA'] };
  const ukPattern = { regex: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, countries: ['GB'] };
  const dePattern = { regex: /^\d{5}$/i, countries: ['DE'] };
  const auPattern = { regex: /^\d{4}$/i, countries: ['AU'] };
  const frPattern = { regex: /^\d{5}$/i, countries: ['FR'] };
  const inPattern = { regex: /^\d{6}$/i, countries: ['IN'] };
  const brPattern = { regex: /^\d{5}-?\d{3}$/i, countries: ['BR'] };
  const ngPattern = { regex: /^\d{6}$/i, countries: ['NG'] };
  const mxPattern = { regex: /^\d{5}$/i, countries: ['MX'] };
  const zaPattern = { regex: /^\d{4}$/i, countries: ['ZA'] };

  return {
    usRanges,
    patterns: [caPattern, ukPattern, dePattern, auPattern, frPattern, inPattern, brPattern, ngPattern, mxPattern, zaPattern],
  };
}

function resolvePostalCode(postalCode, countryIso2) {
  if (!postalCode) return null;

  const cleaned = postalCode.toString().trim().toUpperCase();

  if (countryIso2) {
    return { postal_code: cleaned, country_code: countryIso2.toUpperCase(), confidence: 0.85, match_type: 'country_provided' };
  }

  const formatResult = detectFormat(cleaned);
  if (formatResult) {
    return { postal_code: cleaned, country_code: formatResult.country_code, confidence: formatResult.confidence, match_type: 'format_detected' };
  }

  return { postal_code: cleaned, country_code: null, confidence: 0.2, match_type: 'unknown_format' };
}

function detectFormat(postalCode) {
  const cleaned = postalCode.replace(/\s/g, '');

  if (/^\d{5}(-\d{4})?$/.test(cleaned)) {
    return { country_code: 'US', confidence: 0.8 };
  }

  for (const pattern of ZIP_COUNTRY_MAP.patterns) {
    if (pattern.regex.test(cleaned)) {
      return { country_code: pattern.countries[0], confidence: 0.75 };
    }
  }

  if (/^\d{5}$/.test(cleaned)) {
    return { country_code: null, confidence: 0.3 };
  }

  return null;
}

function extractPostalCode(address) {
  if (!address) return null;

  const patterns = [
    /\b\d{5}(?:-\d{4})?\b/,
    /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i,
    /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/i,
    /\b\d{4,6}\b/,
  ];

  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match) return match[0].trim();
  }
  return null;
}

module.exports = { resolvePostalCode, extractPostalCode, detectFormat };
