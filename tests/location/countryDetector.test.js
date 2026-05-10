const { detectCountry, resolveExplicitCountry, resolvePhoneCountry } = require('../../src/services/location/countryDetector');

describe('Country Detector', () => {
  describe('explicit country resolution', () => {
    test('resolves by iso2 code', async () => {
      const result = await resolveExplicitCountry('US');
      expect(result).not.toBeNull();
      expect(result.iso2).toBe('US');
    });

    test('resolves by iso3 code', async () => {
      const result = await resolveExplicitCountry('USA');
      expect(result).not.toBeNull();
      expect(result.iso3).toBe('USA');
    });

    test('resolves by name', async () => {
      const result = await resolveExplicitCountry('Nigeria');
      expect(result).not.toBeNull();
      expect(result.iso2).toBe('NG');
    });

    test('resolves by alias', async () => {
      const result = await resolveExplicitCountry('USA');
      expect(result).not.toBeNull();
    });

    test('returns null for unknown country', async () => {
      const result = await resolveExplicitCountry('Atlantis');
      expect(result).toBeNull();
    });
  });

  describe('phone country resolution', () => {
    test('detects US from +1 phone', () => {
      const result = resolvePhoneCountry('+12125551234');
      expect(result).not.toBeNull();
      expect(result.country_code).toBe('US');
    });

    test('detects Nigeria from +234 phone', () => {
      const result = resolvePhoneCountry('+2348012345678');
      expect(result).not.toBeNull();
      expect(result.country_code).toBe('NG');
    });

    test('returns null for invalid phone', () => {
      const result = resolvePhoneCountry('');
      expect(result).toBeNull();
    });
  });

  describe('full country detection pipeline', () => {
    test('detects country from explicit field', async () => {
      const result = await detectCountry({ country: 'United States' });
      expect(result.country_code).toBe('US');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.ambiguous).toBe(false);
      expect(result.detection_methods).toContain('explicit_country');
    });

    test('detects country from phone', async () => {
      const result = await detectCountry({ phone: '+2348012345678' });
      expect(result.country_code).toBe('NG');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test('combines phone + region for higher confidence', async () => {
      const result = await detectCountry({ phone: '+12125551234', state: 'Texas' });
      expect(result.country_code).toBe('US');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test('detects country from region only', async () => {
      const result = await detectCountry({ state: 'Lagos' });
      expect(result.country_code).toBe('NG');
    });

    test('returns ambiguous for Victoria (AU vs CA)', async () => {
      const result = await detectCountry({ state: 'Victoria' });
      expect(result.ambiguous).toBe(true);
      expect(result.possible_countries).toContain('AU');
      expect(result.possible_countries).toContain('CA');
    });

    test('returns empty result for no data', async () => {
      const result = await detectCountry({});
      expect(result.country_code).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });
});
