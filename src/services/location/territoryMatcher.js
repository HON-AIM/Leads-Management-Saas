const Territory = require('../../../models/Territory');

async function matchTerritory(tenantId, geoResult) {
  if (!tenantId || !geoResult) return null;

  const { normalized_country_code, normalized_region_code, normalized_city, postal_code } = geoResult;

  const query = {
    tenant_id: tenantId,
    active: true,
    country_code: normalized_country_code,
  };

  if (normalized_region_code) {
    query.regions = normalized_region_code;
  }

  const territories = await Territory.find(query).sort({ name: 1 }).lean();
  if (territories.length === 0) return null;

  const matches = [];

  for (const t of territories) {
    let score = 0;
    const matchReasons = [];

    if (t.regions && t.regions.includes(normalized_region_code)) {
      score += 0.5;
      matchReasons.push('region');
    }

    if (normalized_city && t.cities && t.cities.length > 0) {
      const cityMatch = t.cities.some(c => c.toLowerCase() === normalized_city.toLowerCase());
      if (cityMatch) {
        score += 0.3;
        matchReasons.push('city');
      }
    }

    if (postal_code && t.postal_codes && t.postal_codes.length > 0) {
      const postalMatch = t.postal_codes.includes(postal_code);
      if (postalMatch) {
        score += 0.2;
        matchReasons.push('postal_code');
      }
    }

    if (score > 0) {
      matches.push({ territory: t, score: Math.round(score * 100) / 100, matchReasons });
    }
  }

  if (matches.length === 0) return null;

  matches.sort((a, b) => b.score - a.score);
  return matches[0];
}

async function getTerritoriesForTenant(tenantId) {
  return Territory.find({ tenant_id: tenantId, active: true }).sort({ name: 1 }).lean();
}

async function createTerritory(data) {
  return Territory.create(data);
}

async function updateTerritory(id, data) {
  return Territory.findByIdAndUpdate(id, { $set: data }, { new: true });
}

async function deleteTerritory(id) {
  return Territory.findByIdAndUpdate(id, { $set: { active: false } }, { new: true });
}

module.exports = { matchTerritory, getTerritoriesForTenant, createTerritory, updateTerritory, deleteTerritory };
