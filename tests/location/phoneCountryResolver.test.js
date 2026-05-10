const { resolveCountryFromPhone } = require('../../src/services/location/phoneCountryResolver');

describe('Phone Country Resolver', () => {
  test('detects US phone number', () => {
    const result = resolveCountryFromPhone('+12125551234');
    expect(result).not.toBeNull();
    expect(result.country_code).toBe('US');
    expect(result.is_valid).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  test('detects Nigerian phone number', () => {
    const result = resolveCountryFromPhone('+2348012345678');
    expect(result).not.toBeNull();
    expect(result.country_code).toBe('NG');
    expect(result.is_valid).toBe(true);
  });

  test('detects UK phone number', () => {
    const result = resolveCountryFromPhone('+447911123456');
    expect(result).not.toBeNull();
    expect(result.country_code).toBe('GB');
    expect(result.is_valid).toBe(true);
  });

  test('detects Canadian phone number', () => {
    const result = resolveCountryFromPhone('+14165551234');
    expect(result).not.toBeNull();
    expect(result.country_code).toBe('CA');
  });

  test('detects Australian phone number', () => {
    const result = resolveCountryFromPhone('+61412345678');
    expect(result).not.toBeNull();
    expect(result.country_code).toBe('AU');
  });

  test('returns null for invalid phone', () => {
    const result = resolveCountryFromPhone('not-a-phone');
    expect(result).toBeNull();
  });

  test('returns null for empty phone', () => {
    const result = resolveCountryFromPhone(null);
    expect(result).toBeNull();
  });

  test('handles phone with special characters', () => {
    const result = resolveCountryFromPhone('+1 (212) 555-1234');
    expect(result).not.toBeNull();
    expect(result.country_code).toBe('US');
  });

  test('provides formatted outputs', () => {
    const result = resolveCountryFromPhone('+2348012345678');
    expect(result.formatted_international).toBeDefined();
    expect(result.formatted_national).toBeDefined();
    expect(result.national_number).toBeDefined();
  });

  test('classifies mobile numbers', () => {
    const result = resolveCountryFromPhone('+2348012345678');
    expect(result.phone_type).toBe('mobile');
  });

  test('provides country name', () => {
    const result = resolveCountryFromPhone('+12125551234');
    expect(result.country_name).toBe('United States');
  });
});
