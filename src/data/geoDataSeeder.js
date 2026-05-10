const Country = require('../../models/Country');
const Region = require('../../models/Region');
const RegionAlias = require('../../models/RegionAlias');
const path = require('path');
const countriesData = require('./countries.json');
const regionsData = require('./regions.json');

const LOG_PREFIX = '[GeoDataSeeder]';

function log(step, details = {}) {
  const ts = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${ts} | Step: ${step}`, details);
}

async function seedCountries() {
  let seeded = 0;
  for (const c of countriesData) {
    const existing = await Country.findOne({ iso2: c.iso2 });
    if (!existing) {
      await Country.create(c);
      seeded++;
    }
  }
  if (seeded > 0) log('SEEDED_COUNTRIES', { count: seeded });
  return seeded;
}

async function seedRegions() {
  let seeded = 0;
  for (const r of regionsData) {
    const existing = await Region.findOne({ country_iso2: r.country_iso2, code: r.code });
    if (!existing) {
      await Region.create(r);
      seeded++;
    }
  }
  if (seeded > 0) log('SEEDED_REGIONS', { count: seeded });
  return seeded;
}

async function seedAliases() {
  let seeded = 0;
  const regions = await Region.find({ active: true }).lean();
  for (const region of regions) {
    for (const alias of (region.aliases || [])) {
      const existing = await RegionAlias.findOne({ raw_input: alias.toLowerCase(), country_iso2: region.country_iso2 });
      if (!existing) {
        await RegionAlias.create({
          country_iso2: region.country_iso2,
          raw_input: alias.toLowerCase(),
          normalized_region_code: region.code,
          confidence_weight: alias === region.code.toLowerCase() || alias === region.name.toLowerCase() ? 1 : 0.9,
        });
        seeded++;
      }
    }
  }
  if (seeded > 0) log('SEEDED_ALIASES', { count: seeded });
  return seeded;
}

async function seedAll() {
  const countries = await seedCountries();
  const regions = await seedRegions();
  const aliases = await seedAliases();
  log('SEED_COMPLETE', { countries, regions, aliases });
  return { countries, regions, aliases };
}

module.exports = { seedAll, seedCountries, seedRegions, seedAliases };
