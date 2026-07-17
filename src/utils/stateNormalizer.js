const US_STATES = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH',
  oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  'district of columbia': 'DC', 'washington dc': 'DC', 'washington d.c.': 'DC',
  al: 'AL', ak: 'AK', az: 'AZ', ar: 'AR', ca: 'CA', co: 'CO', ct: 'CT', de: 'DE',
  fl: 'FL', ga: 'GA', hi: 'HI', id: 'ID', il: 'IL', in: 'IN', ia: 'IA', ks: 'KS',
  ky: 'KY', la: 'LA', me: 'ME', md: 'MD', ma: 'MA', mi: 'MI', mn: 'MN', ms: 'MS',
  mo: 'MO', mt: 'MT', ne: 'NE', nv: 'NV', nh: 'NH', nj: 'NJ', nm: 'NM', ny: 'NY',
  nc: 'NC', nd: 'ND', oh: 'OH', ok: 'OK', or: 'OR', pa: 'PA', ri: 'RI', sc: 'SC',
  sd: 'SD', tn: 'TN', tx: 'TX', ut: 'UT', vt: 'VT', va: 'VA', wa: 'WA', wv: 'WV',
  wi: 'WI', wy: 'WY', dc: 'DC',
};

const ABBREVIATION_TO_FULL = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

function normalizeState(state) {
  if (!state || typeof state !== 'string') return null;

  const trimmed = state.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  const direct = US_STATES[lower];
  if (direct) return direct;

  const stripped = lower.replace(/[^a-z]/g, '');
  if (stripped.length >= 2 && stripped.length <= 3) {
    const fromStripped = US_STATES[stripped];
    if (fromStripped) return fromStripped;
  }

  return null;
}

function stateToFullName(abbr) {
  if (!abbr || typeof abbr !== 'string') return null;
  return ABBREVIATION_TO_FULL[abbr.toUpperCase()] || null;
}

module.exports = { normalizeState, stateToFullName, US_STATES, ABBREVIATION_TO_FULL };
