const Country = require('../../../models/Country');
const Region = require('../../../models/Region');
const libPhoneNumber = require('libphonenumber-js');

const AMBIGUOUS_REGIONS = {
  'victoria': ['AU', 'CA'],
  'georgia': ['US', 'GE'],
  'newport': ['US', 'GB'],
  'northumberland': ['GB', 'CA'],
  'chester': ['GB', 'US'],
  'westminster': ['GB', 'US'],
  'london': ['GB', 'CA', 'US'],
  'paris': ['FR', 'US'],
  'madrid': ['ES', 'PH'],
  'ontario': ['CA', 'US'],
  'manchester': ['GB', 'US'],
  'birmingham': ['GB', 'US'],
  'austin': ['US'],
  'cairo': ['EG', 'US'],
  'alexandria': ['EG', 'US'],
  'dublin': ['IE', 'US'],
  'waterford': ['IE', 'US'],
};

async function detectCountry(payload) {
  const methods = [];
  const candidates = [];

  if (payload.country) {
    const country = await resolveExplicitCountry(payload.country);
    if (country) {
      candidates.push({ country_code: country.iso2, confidence: 0.95, method: 'explicit_country' });
      methods.push('explicit_country');
    }
  }

  if (payload.phone) {
    const phoneResult = resolvePhoneCountry(payload.phone);
    if (phoneResult) {
      const overlap = candidates.some(c => c.country_code === phoneResult.country_code);
      if (!overlap) {
        const conf = candidates.length > 0 ? 0.85 : 0.9;
        candidates.push({ country_code: phoneResult.country_code, confidence: conf, method: 'phone_detection' });
        methods.push('phone_detection');
      } else {
        candidates.forEach(c => {
          if (c.country_code === phoneResult.country_code) c.confidence = Math.min(c.confidence + 0.1, 0.99);
        });
      }
    }
  }

  if (payload.state || payload.region) {
    const regionInput = payload.state || payload.region;
    const regionResult = await resolveRegionCountries(regionInput);
    if (regionResult && regionResult.length > 0) {
      for (const r of regionResult) {
        const existing = candidates.find(c => c.country_code === r.country_code);
        if (existing) {
          existing.confidence = Math.min(existing.confidence + 0.1, 0.99);
        } else {
          candidates.push({ country_code: r.country_code, confidence: r.confidence, method: 'region_match' });
        }
      }
      if (!methods.includes('region_match')) methods.push('region_match');
    }
  }

  if (payload.postal_code) {
    if (!methods.includes('postal_match')) methods.push('postal_match');
  }

  if (candidates.length === 0) {
    return {
      country_code: null,
      confidence: 0,
      ambiguous: true,
      possible_countries: [],
      detection_methods: methods,
    };
  }

  candidates.sort((a, b) => b.confidence - a.confidence);
  const top = candidates[0];
  const topConfidence = candidates.filter(c => Math.abs(c.confidence - top.confidence) < 0.15);

  if (topConfidence.length > 1) {
    const possible = topConfidence.map(c => c.country_code);
    return {
      country_code: null,
      confidence: top.confidence,
      ambiguous: true,
      possible_countries: [...new Set(possible)],
      detection_methods: methods,
    };
  }

  return {
    country_code: top.country_code,
    confidence: top.confidence,
    ambiguous: false,
    possible_countries: [top.country_code],
    detection_methods: methods,
  };
}

async function resolveExplicitCountry(input) {
  if (!input) return null;
  const cleaned = input.trim();
  if (cleaned.length === 2) {
    const byCode = await Country.findOne({ iso2: cleaned.toUpperCase(), active: true }).lean();
    if (byCode) return byCode;
  }
  if (cleaned.length === 3) {
    const byCode = await Country.findOne({ iso3: cleaned.toUpperCase(), active: true }).lean();
    if (byCode) return byCode;
  }
  const byName = await Country.findOne({
    active: true,
    $or: [
      { name: { $regex: new RegExp(`^${escapeRegex(cleaned)}$`, 'i') } },
      { aliases: cleaned.toLowerCase() },
    ],
  }).lean();
  if (byName) return byName;

  const search = await Country.find({
    active: true,
    name: { $regex: escapeRegex(cleaned), $options: 'i' },
  }).lean();
  return search.length > 0 ? search[0] : null;
}

function resolvePhoneCountry(phone) {
  if (!phone) return null;
  try {
    const parsed = libPhoneNumber.parsePhoneNumber(phone);
    if (!parsed || !parsed.isValid()) {
      const cleaned = phone.replace(/[^\d+]/g, '');
      if (cleaned.startsWith('+')) {
        const retry = libPhoneNumber.parsePhoneNumber(cleaned);
        if (retry && retry.isValid()) {
          return { country_code: retry.country, confidence: 0.95 };
        }
      }
      const withoutPlus = cleaned.replace(/^\+/, '');
      for (const cc of COUNTRY_CODE_LENGTHS) {
        if (withoutPlus.startsWith(cc.code)) {
          return { country_code: cc.iso2, confidence: 0.7 };
        }
      }
      return null;
    }
    return { country_code: parsed.country, confidence: 0.95 };
  } catch {
    return null;
  }
}

const COUNTRY_CODE_LENGTHS = [
  { code: '1', iso2: 'US' }, { code: '7', iso2: 'RU' },
  { code: '20', iso2: 'EG' }, { code: '27', iso2: 'ZA' },
  { code: '31', iso2: 'NL' }, { code: '33', iso2: 'FR' },
  { code: '34', iso2: 'ES' }, { code: '39', iso2: 'IT' },
  { code: '44', iso2: 'GB' }, { code: '49', iso2: 'DE' },
  { code: '52', iso2: 'MX' }, { code: '55', iso2: 'BR' },
  { code: '61', iso2: 'AU' }, { code: '81', iso2: 'JP' },
  { code: '82', iso2: 'KR' }, { code: '86', iso2: 'CN' },
  { code: '91', iso2: 'IN' }, { code: '234', iso2: 'NG' },
];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function resolveRegionCountries(input) {
  if (!input) return [];
  const cleaned = input.trim().toLowerCase();

  if (AMBIGUOUS_REGIONS[cleaned]) {
    return AMBIGUOUS_REGIONS[cleaned].map(code => ({
      country_code: code,
      confidence: 0.45,
    }));
  }

  const alias = await RegionAlias.findOne({ raw_input: cleaned }).lean();
  if (alias) {
    return [{ country_code: alias.country_iso2, confidence: 0.8 }];
  }

  const regions = await Region.find({
    active: true,
    $or: [
      { name: { $regex: new RegExp(`^${escapeRegex(cleaned)}$`, 'i') } },
      { code: { $regex: new RegExp(`^${escapeRegex(cleaned)}$`, 'i') } },
      { aliases: cleaned },
    ],
  }).lean();

  if (regions.length === 0) return [];

  const countryMap = {};
  for (const r of regions) {
    countryMap[r.country_iso2] = (countryMap[r.country_iso2] || 0) + 1;
  }

  return Object.entries(countryMap).map(([cc, count]) => ({
    country_code: cc,
    confidence: regions.length === 1 ? 0.85 : 0.5,
  }));
}

module.exports = { detectCountry, resolveExplicitCountry, resolvePhoneCountry, resolveRegionCountries };
