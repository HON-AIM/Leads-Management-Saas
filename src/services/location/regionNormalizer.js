const Region = require('../../../models/Region');
const RegionAlias = require('../../../models/RegionAlias');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function normalizeRegion(input, countryIso2) {
  if (!input) return null;

  const cleaned = input.toString().trim();
  if (!cleaned) return null;

  if (countryIso2) {
    const result = await normalizeWithCountry(cleaned, countryIso2.toUpperCase());
    if (result) return result;
  }

  const result = await normalizeWithoutCountry(cleaned);
  return result;
}

async function normalizeWithCountry(input, countryIso2) {
  const lower = input.toLowerCase();

  const exactCode = await Region.findOne({
    country_iso2: countryIso2,
    code: input.toUpperCase(),
    active: true,
  }).lean();
  if (exactCode) {
    return { normalized_code: exactCode.code, normalized_name: exactCode.name, match_type: 'exact_code', confidence: 1.0 };
  }

  const exactName = await Region.findOne({
    country_iso2: countryIso2,
    name: { $regex: new RegExp(`^${escapeRegex(input)}$`, 'i') },
    active: true,
  }).lean();
  if (exactName) {
    return { normalized_code: exactName.code, normalized_name: exactName.name, match_type: 'exact_name', confidence: 1.0 };
  }

  const alias = await RegionAlias.findOne({
    country_iso2: countryIso2,
    raw_input: lower,
  }).lean();
  if (alias) {
    const region = await Region.findOne({ country_iso2: countryIso2, code: alias.normalized_region_code, active: true }).lean();
    return { normalized_code: alias.normalized_region_code, normalized_name: region?.name || alias.normalized_region_code, match_type: 'alias', confidence: 0.92 };
  }

  const fuzzyAlias = await RegionAlias.findOne({
    country_iso2: countryIso2,
    raw_input: { $regex: escapeRegex(lower), $options: 'i' },
  }).lean();
  if (fuzzyAlias) {
    const region = await Region.findOne({ country_iso2: countryIso2, code: fuzzyAlias.normalized_region_code, active: true }).lean();
    return { normalized_code: fuzzyAlias.normalized_region_code, normalized_name: region?.name || fuzzyAlias.normalized_region_code, match_type: 'fuzzy_alias', confidence: 0.8 };
  }

  const search = await Region.find({
    country_iso2: countryIso2,
    active: true,
    $or: [
      { name: { $regex: escapeRegex(input), $options: 'i' } },
      { aliases: { $regex: lower, $options: 'i' } },
    ],
  }).lean();

  if (search.length > 0) {
    return { normalized_code: search[0].code, normalized_name: search[0].name, match_type: 'fuzzy_search', confidence: 0.75 };
  }

  return null;
}

async function normalizeWithoutCountry(input) {
  const lower = input.toLowerCase();

  const alias = await RegionAlias.findOne({ raw_input: lower }).lean();
  if (alias) {
    const region = await Region.findOne({ country_iso2: alias.country_iso2, code: alias.normalized_region_code, active: true }).lean();
    return { normalized_code: alias.normalized_region_code, normalized_name: region?.name || alias.normalized_region_code, match_type: 'alias', confidence: 0.85 };
  }

  const regions = await Region.find({
    active: true,
    $or: [
      { code: input.toUpperCase() },
      { name: { $regex: new RegExp(`^${escapeRegex(input)}$`, 'i') } },
    ],
  }).lean();

  if (regions.length === 1) {
    return { normalized_code: regions[0].code, normalized_name: regions[0].name, match_type: 'unique_match', confidence: 0.85 };
  }

  if (regions.length > 1) {
    return { normalized_code: regions[0].code, normalized_name: regions[0].name, match_type: 'ambiguous_match', confidence: 0.5, possible_countries: regions.map(r => r.country_iso2) };
  }

  const fuzzy = await Region.find({
    active: true,
    $or: [
      { name: { $regex: escapeRegex(input), $options: 'i' } },
      { aliases: lower },
    ],
  }).lean();

  if (fuzzy.length === 1) {
    return { normalized_code: fuzzy[0].code, normalized_name: fuzzy[0].name, match_type: 'fuzzy_unique', confidence: 0.7 };
  }

  if (fuzzy.length > 1) {
    return { normalized_code: fuzzy[0].code, normalized_name: fuzzy[0].name, match_type: 'fuzzy_ambiguous', confidence: 0.4, possible_countries: fuzzy.map(r => r.country_iso2) };
  }

  return null;
}

module.exports = { normalizeRegion };
