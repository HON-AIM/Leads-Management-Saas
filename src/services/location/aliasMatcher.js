const RegionAlias = require('../../../models/RegionAlias');
const Region = require('../../../models/Region');

async function matchAlias(input, countryIso2) {
  if (!input) return null;
  const lower = input.toString().trim().toLowerCase();
  if (!lower) return null;

  const query = { raw_input: lower };
  if (countryIso2) query.country_iso2 = countryIso2.toUpperCase();

  const alias = await RegionAlias.findOne(query).sort({ confidence_weight: -1 }).lean();
  if (alias) return alias;

  const partialQuery = {
    raw_input: { $regex: escapeRegex(lower), $options: 'i' },
  };
  if (countryIso2) partialQuery.country_iso2 = countryIso2.toUpperCase();

  const partial = await RegionAlias.findOne(partialQuery).sort({ confidence_weight: -1 }).lean();
  if (partial) return partial;

  return null;
}

async function learnAlias(countryIso2, rawInput, normalizedCode, confidenceWeight = 1) {
  const lower = rawInput.trim().toLowerCase();
  await RegionAlias.updateOne(
    { raw_input: lower, country_iso2: countryIso2.toUpperCase() },
    {
      $set: {
        normalized_region_code: normalizedCode.toUpperCase(),
        confidence_weight: confidenceWeight,
      },
    },
    { upsert: true }
  );
}

async function bulkLearnAliases(entries) {
  const results = [];
  for (const entry of entries) {
    const existing = await RegionAlias.findOne({
      raw_input: entry.raw_input.toLowerCase(),
      country_iso2: entry.country_iso2.toUpperCase(),
    });
    if (!existing) {
      await RegionAlias.create({
        country_iso2: entry.country_iso2.toUpperCase(),
        raw_input: entry.raw_input.toLowerCase(),
        normalized_region_code: entry.normalized_region_code.toUpperCase(),
        confidence_weight: entry.confidence_weight || 1,
      });
      results.push(entry);
    }
  }
  return results;
}

async function getAliasesForRegion(countryIso2, regionCode) {
  return RegionAlias.find({
    country_iso2: countryIso2.toUpperCase(),
    normalized_region_code: regionCode.toUpperCase(),
  }).sort({ confidence_weight: -1 }).lean();
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { matchAlias, learnAlias, bulkLearnAliases, getAliasesForRegion };
