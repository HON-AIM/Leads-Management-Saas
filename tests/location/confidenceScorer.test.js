const { calculateConfidence, isRoutable } = require('../../src/services/location/confidenceScorer');

describe('Confidence Scorer', () => {
  test('returns 0 for no detection methods', () => {
    const result = calculateConfidence({ detectionMethods: [] });
    expect(result.score).toBe(0);
    expect(result.level).toBe('unknown');
  });

  test('high confidence with explicit country + phone + region', () => {
    const result = calculateConfidence({
      phoneMatch: { is_valid: true, confidence: 0.95 },
      countryMatch: { explicit: true },
      regionMatch: { match_type: 'exact_code', confidence: 1.0 },
      detectionMethods: ['explicit_country', 'phone_detection', 'region_match'],
    });
    expect(result.score).toBeGreaterThanOrEqual(0.9);
    expect(result.level).toBe('very_high');
  });

  test('medium confidence with phone only', () => {
    const result = calculateConfidence({
      phoneMatch: { is_valid: true, confidence: 0.95 },
      detectionMethods: ['phone_detection'],
    });
    expect(result.score).toBeGreaterThanOrEqual(0.2);
    expect(result.score).toBeLessThanOrEqual(0.5);
    expect(result.level).toBe('medium');
  });

  test('routable score above threshold', () => {
    expect(isRoutable(0.75)).toBe(true);
    expect(isRoutable(0.9)).toBe(true);
    expect(isRoutable(1.0)).toBe(true);
  });

  test('non-routable score below threshold', () => {
    expect(isRoutable(0.3)).toBe(false);
    expect(isRoutable(0.0)).toBe(false);
    expect(isRoutable(0.49)).toBe(false);
  });

  test('low confidence with ambiguous region only', () => {
    const result = calculateConfidence({
      regionMatch: { match_type: 'fuzzy_ambiguous', confidence: 0.4 },
      detectionMethods: ['fuzzy_match'],
    });
    expect(result.score).toBeLessThan(0.5);
    expect(result.level).toBe('low');
  });

  test('multiple methods increase confidence with bonus', () => {
    const single = calculateConfidence({
      phoneMatch: { is_valid: true },
      detectionMethods: ['phone_detection'],
    });
    const multi = calculateConfidence({
      phoneMatch: { is_valid: true },
      countryMatch: { explicit: true },
      regionMatch: { match_type: 'exact_code' },
      detectionMethods: ['phone_detection', 'explicit_country', 'region_match'],
    });
    expect(multi.score).toBeGreaterThan(single.score);
    expect(multi.breakdown.methodCount).toBe(3);
  });

  test('provides factor breakdown', () => {
    const result = calculateConfidence({
      phoneMatch: { is_valid: true },
      detectionMethods: ['phone_detection'],
    });
    expect(result.factors).toHaveLength(1);
    expect(result.factors[0].method).toBe('phone_detection');
    expect(result.factors[0].weight).toBeGreaterThan(0);
    expect(result.factors[0].methodScore).toBeGreaterThan(0);
  });
});
