const { resolvePostalCode, extractPostalCode } = require('../../src/services/location/postalCodeResolver');

describe('Postal Code Resolver', () => {
  test('detects US ZIP code format', () => {
    const result = resolvePostalCode('77001');
    expect(result).not.toBeNull();
    expect(result.country_code).toBe('US');
    expect(result.match_type).toBe('format_detected');
  });

  test('detects US ZIP+4 format', () => {
    const result = resolvePostalCode('77001-1234');
    expect(result).not.toBeNull();
    expect(result.country_code).toBe('US');
  });

  test('uses provided country code', () => {
    const result = resolvePostalCode('77001', 'US');
    expect(result).not.toBeNull();
    expect(result.country_code).toBe('US');
    expect(result.match_type).toBe('country_provided');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('returns low confidence for unknown format', () => {
    const result = resolvePostalCode('XYZ');
    expect(result).not.toBeNull();
    expect(result.confidence).toBeLessThan(0.5);
    expect(result.match_type).toBe('unknown_format');
  });

  test('extracts ZIP from address string', () => {
    const result = extractPostalCode('123 Main St, Houston, TX 77001');
    expect(result).toBe('77001');
  });

  test('extracts ZIP+4 from address', () => {
    const result = extractPostalCode('456 Oak Ave, Dallas, TX 75201-1234');
    expect(result).toBe('75201-1234');
  });

  test('extracts Canadian postal code', () => {
    const result = extractPostalCode('100 Queen St, Toronto, ON M5H 2N2');
    expect(result).toBe('M5H 2N2');
  });

  test('returns null for address with no postal code', () => {
    const result = extractPostalCode('Unknown location');
    expect(result).toBeNull();
  });

  test('returns null for null input', () => {
    const result = extractPostalCode(null);
    expect(result).toBeNull();
  });
});
