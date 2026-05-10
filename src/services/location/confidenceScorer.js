function calculateConfidence(detectionResults) {
  const {
    phoneMatch,
    countryMatch,
    regionMatch,
    postalMatch,
    territoryMatch,
    detectionMethods,
  } = detectionResults;

  if (!detectionMethods || detectionMethods.length === 0) {
    return { score: 0, level: 'unknown', breakdown: {}, factors: [] };
  }

  const weights = {
    explicit_country: 0.35,
    phone_detection: 0.25,
    region_match: 0.20,
    alias_match: 0.15,
    postal_match: 0.15,
    territory_match: 0.10,
    fuzzy_match: 0.10,
  };

  let score = 0;
  const factors = [];

  for (const method of detectionMethods) {
    const weight = weights[method] || 0.05;
    let methodScore = 0;

    switch (method) {
      case 'explicit_country':
        methodScore = countryMatch?.explicit ? 1.0 : 0.8;
        break;
      case 'phone_detection':
        methodScore = phoneMatch?.is_valid ? 1.0 : phoneMatch?.confidence || 0.7;
        break;
      case 'region_match':
        methodScore = regionMatch?.match_type === 'exact_code' ? 1.0
          : regionMatch?.match_type === 'exact_name' ? 1.0
          : regionMatch?.match_type === 'alias' ? 0.92
          : regionMatch?.confidence || 0.7;
        break;
      case 'postal_match':
        methodScore = postalMatch ? 0.85 : 0;
        break;
      case 'territory_match':
        methodScore = territoryMatch ? 0.9 : 0;
        break;
      case 'alias_match':
        methodScore = 0.85;
        break;
      case 'fuzzy_match':
        methodScore = 0.6;
        break;
      default:
        methodScore = 0.5;
    }

    score += weight * methodScore;
    factors.push({ method, weight, methodScore, contribution: weight * methodScore });
  }

  const methodCountBonus = Math.min((detectionMethods.length - 1) * 0.05, 0.15);
  score = Math.min(score + methodCountBonus, 1.0);

  let level;
  if (score >= 0.9) level = 'very_high';
  else if (score >= 0.75) level = 'high';
  else if (score >= 0.5) level = 'medium';
  else if (score >= 0.3) level = 'low';
  else level = 'very_low';

  return {
    score: Math.round(score * 100) / 100,
    level,
    breakdown: { methodCount: detectionMethods.length, bonus: methodCountBonus },
    factors,
  };
}

function isRoutable(confidenceScore, threshold = 0.5) {
  return confidenceScore >= threshold;
}

module.exports = { calculateConfidence, isRoutable };
