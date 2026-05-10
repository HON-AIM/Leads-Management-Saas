const { normalizeLocation } = require('../../src/services/location/locationIntelligenceService');

describe('Location Intelligence Service (Integration)', () => {
  test('normalizes Texas with US phone', async () => {
    const result = await normalizeLocation({
      state: 'Texas',
      phone: '+12125551234',
    });
    expect(result.normalized_country_code).toBe('US');
    expect(result.normalized_region_code).toBe('TX');
    expect(result.confidence_score).toBeGreaterThan(0.9);
    expect(result.detection_methods).toContain('phone_detection');
    expect(result.detection_methods).toContain('region_match');
    expect(result.routable).toBe(true);
  });

  test('normalizes TX abbreviation', async () => {
    const result = await normalizeLocation({
      state: 'TX',
      country: 'US',
    });
    expect(result.normalized_country_code).toBe('US');
    expect(result.normalized_region_code).toBe('TX');
    expect(result.confidence_score).toBeGreaterThan(0.9);
  });

  test('normalizes Lagos, Nigeria', async () => {
    const result = await normalizeLocation({
      state: 'Lagos',
      phone: '+2348012345678',
    });
    expect(result.normalized_country_code).toBe('NG');
    expect(result.normalized_region_code).toBe('LA');
    expect(result.confidence_score).toBeGreaterThan(0.8);
  });

  test('detects country from phone alone', async () => {
    const result = await normalizeLocation({
      phone: '+447911123456',
    });
    expect(result.normalized_country_code).toBe('GB');
    expect(result.phone_country_code).toBe('GB');
    expect(result.confidence_score).toBeGreaterThanOrEqual(0.2);
  });

  test('handles ambiguous Victoria region', async () => {
    const result = await normalizeLocation({
      state: 'Victoria',
    });
    expect(result.country_ambiguous).toBe(true);
    expect(result.possible_countries.length).toBeGreaterThan(1);
    expect(result.routable).toBe(false);
  });

  test('handles complete payload with high confidence', async () => {
    const result = await normalizeLocation({
      country: 'United States',
      state: 'California',
      city: 'Los Angeles',
      phone: '+12105551234',
      postal_code: '90001',
    });
    expect(result.normalized_country_code).toBe('US');
    expect(result.normalized_region_code).toBe('CA');
    expect(result.normalized_city).toBe('Los Angeles');
    expect(result.postal_code).toBe('90001');
    expect(result.confidence_score).toBeGreaterThan(0.95);
    expect(result.country_ambiguous).toBe(false);
    expect(result.routable).toBe(true);
    expect(result.pipeline_duration_ms).toBeGreaterThan(0);
  });

  test('handles empty payload gracefully', async () => {
    const result = await normalizeLocation({});
    expect(result.normalized_country_code).toBeNull();
    expect(result.normalized_region_code).toBeNull();
    expect(result.confidence_score).toBe(0);
    expect(result.routable).toBe(false);
    expect(result.detection_methods).toEqual([]);
  });

  test('handles Canadian province', async () => {
    const result = await normalizeLocation({
      state: 'Ontario',
      country: 'CA',
    });
    expect(result.normalized_country_code).toBe('CA');
    expect(result.normalized_region_code).toBe('ON');
    expect(result.confidence_score).toBeGreaterThan(0.9);
  });

  test('handles Australian state', async () => {
    const result = await normalizeLocation({
      state: 'NSW',
      country: 'AU',
    });
    expect(result.normalized_country_code).toBe('AU');
    expect(result.normalized_region_code).toBe('NSW');
  });

  test('provides detection method logging', async () => {
    const result = await normalizeLocation({
      country: 'Nigeria',
      state: 'Lagos',
    });
    expect(result.detection_methods).toContain('explicit_country');
    expect(result.detection_methods).toContain('region_match');
    expect(result.detection_details).toBeDefined();
    expect(result.detection_details.country).toBeDefined();
  });
});
