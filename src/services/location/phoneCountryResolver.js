const libPhoneNumber = require('libphonenumber-js');

function resolveCountryFromPhone(phone) {
  if (!phone) return null;
  try {
    const cleaned = phone.replace(/[^\d+]/g, '');
    const parsed = libPhoneNumber.parsePhoneNumber(cleaned);
    if (parsed && parsed.isValid()) {
      return {
        country_code: parsed.country,
        country_name: getCountryName(parsed.country),
        phone_type: getPhoneType(parsed.getType()),
        national_number: parsed.nationalNumber,
        formatted_international: parsed.formatInternational(),
        formatted_national: parsed.formatNational(),
        is_valid: true,
        confidence: 0.95,
      };
    }
    const result = parsePartialPhone(cleaned);
    if (result) return result;
    return null;
  } catch {
    return null;
  }
}

function parsePartialPhone(cleaned) {
  const digits = cleaned.replace(/^\+/, '');
  const COUNTRY_PREFIXES = [
    { code: '1', iso2: 'US', name: 'United States' },
    { code: '7', iso2: 'RU', name: 'Russia' },
    { code: '20', iso2: 'EG', name: 'Egypt' },
    { code: '27', iso2: 'ZA', name: 'South Africa' },
    { code: '31', iso2: 'NL', name: 'Netherlands' },
    { code: '33', iso2: 'FR', name: 'France' },
    { code: '34', iso2: 'ES', name: 'Spain' },
    { code: '39', iso2: 'IT', name: 'Italy' },
    { code: '44', iso2: 'GB', name: 'United Kingdom' },
    { code: '49', iso2: 'DE', name: 'Germany' },
    { code: '52', iso2: 'MX', name: 'Mexico' },
    { code: '55', iso2: 'BR', name: 'Brazil' },
    { code: '61', iso2: 'AU', name: 'Australia' },
    { code: '81', iso2: 'JP', name: 'Japan' },
    { code: '82', iso2: 'KR', name: 'South Korea' },
    { code: '86', iso2: 'CN', name: 'China' },
    { code: '91', iso2: 'IN', name: 'India' },
    { code: '234', iso2: 'NG', name: 'Nigeria' },
  ];

  for (const prefix of COUNTRY_PREFIXES) {
    if (digits.startsWith(prefix.code)) {
      return {
        country_code: prefix.iso2,
        country_name: prefix.name,
        phone_type: 'unknown',
        national_number: digits.slice(prefix.code.length),
        formatted_international: `+${prefix.code} ${digits.slice(prefix.code.length)}`,
        formatted_national: digits.slice(prefix.code.length),
        is_valid: false,
        confidence: 0.6,
      };
    }
  }
  return null;
}

function getPhoneType(type) {
  if (!type) return 'unknown';
  const map = {
    'FIXED_LINE': 'landline',
    'MOBILE': 'mobile',
    'FIXED_LINE_OR_MOBILE': 'landline_or_mobile',
    'TOLL_FREE': 'toll_free',
    'PREMIUM_RATE': 'premium_rate',
    'SHARED_COST': 'shared_cost',
    'VOIP': 'voip',
    'PERSONAL_NUMBER': 'personal',
    'PAGER': 'pager',
    'UAN': 'uan',
    'VOICEMAIL': 'voicemail',
    'EMERGENCY': 'emergency',
  };
  return map[type] || 'unknown';
}

function getCountryName(code) {
  const names = {
    'US': 'United States', 'CA': 'Canada', 'NG': 'Nigeria',
    'GB': 'United Kingdom', 'AU': 'Australia', 'IN': 'India',
    'DE': 'Germany', 'FR': 'France', 'BR': 'Brazil', 'MX': 'Mexico',
    'ZA': 'South Africa', 'ES': 'Spain', 'IT': 'Italy', 'JP': 'Japan',
    'CN': 'China', 'KR': 'South Korea', 'RU': 'Russia', 'EG': 'Egypt',
  };
  return names[code] || code;
}

module.exports = { resolveCountryFromPhone };
