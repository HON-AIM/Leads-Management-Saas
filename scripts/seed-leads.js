/**
 * Seed a large, varied lead dataset across all US states, including duplicates.
 *
 * Usage:
 *   node scripts/seed-leads.js
 *
 * Env overrides (optional):
 *   SEED_COUNT           — total leads to insert (default 1000)
 *   SEED_DUP_PCT_MIN/MAX — duplicate share in % of SEED_COUNT (default 5/10)
 *   SEED_TENANT_SLUG     — target tenant slug (default 'default')
 *   SEED_CAMPAIGN_NAME   — campaign to attach leads to (default 'TEST GHL')
 *   SEED_RESET=1         — delete existing tenant leads first
 *   SEED_FORCE=1         — append even if the tenant already has leads
 *
 * The script mirrors the real ingestion path: normalized email/phone fields are
 * computed exactly like src/utils/{deduplication,phone,stateNormalizer}.js and
 * duplicates are flagged against unique leads (isDuplicate=false) using the same
 * rules as src/modules/leadsIngestion.js so future dedup lookups behave as if
 * these came through the API.
 */

require('dotenv').config();

const mongoose = require('mongoose');
const config = require('../src/config');

require('../src/models/Tenant');
require('../src/models/User');
require('../src/models/Campaign');
require('../src/models/Lead');

const { normalizeEmailForDedup, normalizePhoneForDedup } = require('../src/utils/deduplication');
const { normalizePhone } = require('../src/utils/phone');
const { normalizeState } = require('../src/utils/stateNormalizer');

const SEED_COUNT = parseInt(process.env.SEED_COUNT, 10) || 1000;
const DUP_PCT_MIN = parseInt(process.env.SEED_DUP_PCT_MIN, 10) || 5;
const DUP_PCT_MAX = parseInt(process.env.SEED_DUP_PCT_MAX, 10) || 10;
const TENANT_SLUG = process.env.SEED_TENANT_SLUG || 'default';
const CAMPAIGN_NAME = process.env.SEED_CAMPAIGN_NAME || 'TEST GHL';
const RESET = /^(1|true)$/i.test(process.env.SEED_RESET || '');
const FORCE = /^(1|true)$/i.test(process.env.SEED_FORCE || '');

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
];

// Slightly skew toward more populous states while still guaranteeing each state
// gets a meaningful share (basePerState) so all 51 are represented.
const BASE_PER_STATE = 14;
const STATE_WEIGHT = {
  AL: 1.4, AK: 1.0, AZ: 2.2, AR: 1.2, CA: 6.0, CO: 2.0, CT: 1.4, DE: 1.0, FL: 4.2, GA: 2.7,
  HI: 1.0, ID: 1.1, IL: 3.6, IN: 2.2, IA: 1.3, KS: 1.2, KY: 1.6, LA: 1.7, ME: 1.0, MD: 2.1,
  MA: 2.3, MI: 3.0, MN: 2.0, MS: 1.2, MO: 2.1, MT: 1.0, NE: 1.1, NV: 1.4, NH: 1.0, NJ: 2.8,
  NM: 1.1, NY: 3.9, NC: 2.8, ND: 1.0, OH: 3.5, OK: 1.5, OR: 1.7, PA: 3.5, RI: 1.0, SC: 1.7,
  SD: 1.0, TN: 2.3, TX: 5.5, UT: 1.6, VT: 1.0, VA: 2.7, WA: 2.6, WV: 1.0, WI: 2.1, WY: 1.0,
  DC: 1.0,
};

const AREA_CODES = {
  AL: ['205', '251', '256', '334'], AK: ['907'], AZ: ['480', '520', '602', '623', '928'],
  AR: ['479', '501', '870'], CA: ['213', '310', '323', '408', '415', '510', '619', '650', '714', '805', '818', '858', '909', '916', '925', '949'],
  CO: ['303', '719', '720', '970'], CT: ['203', '475', '860'], DE: ['302'], DC: ['202'],
  FL: ['239', '305', '321', '352', '407', '561', '727', '772', '786', '813', '850', '863', '904', '941', '954'],
  GA: ['229', '404', '470', '478', '678', '706', '770', '912'], HI: ['808'], ID: ['208'],
  IL: ['217', '224', '309', '312', '331', '618', '630', '708', '773', '815', '847', '872'],
  IN: ['260', '317', '574', '765', '812'], IA: ['319', '515', '563', '641', '712'],
  KS: ['316', '620', '785', '913'], KY: ['270', '502', '606', '859'], LA: ['225', '318', '337', '504', '985'],
  ME: ['207'], MD: ['240', '301', '410', '443', '667'], MA: ['339', '351', '413', '508', '617', '774', '781', '857', '978'],
  MI: ['248', '269', '313', '517', '586', '616', '734', '810', '906', '989'],
  MN: ['218', '320', '507', '612', '651', '763', '952'], MS: ['228', '601', '662', '769'],
  MO: ['314', '417', '573', '636', '660', '816'], MT: ['406'], NE: ['308', '402', '531'], NV: ['702', '775'],
  NH: ['603'], NJ: ['201', '551', '609', '732', '856', '862', '908', '973'], NM: ['505', '575'],
  NY: ['212', '315', '347', '516', '518', '585', '607', '631', '646', '716', '718', '845', '914'],
  NC: ['252', '336', '704', '828', '910', '919', '980'], ND: ['701'], OH: ['216', '234', '330', '419', '440', '513', '614', '740', '937'],
  OK: ['405', '539', '580', '918'], OR: ['503', '541', '971'], PA: ['215', '267', '412', '484', '570', '610', '717', '724', '814'],
  RI: ['401'], SC: ['803', '843', '854', '864'], SD: ['605'], TN: ['423', '615', '731', '865', '901', '931'],
  TX: ['210', '214', '281', '325', '361', '409', '512', '713', '806', '817', '830', '832', '903', '915', '936', '956', '972', '979'],
  UT: ['385', '435', '801'], VT: ['802'], VA: ['276', '434', '540', '571', '703', '757', '804'],
  WA: ['206', '253', '360', '425', '509', '564'], WV: ['304', '681'], WI: ['262', '414', '534', '608', '715', '920'],
  WY: ['307'],
};
const FALLBACK_CODES = ['201', '212', '213', '305', '312', '404', '415', '503', '512', '602', '617', '702', '713', '818', '919'];
const areaCodeFor = (state) => (AREA_CODES[state] || FALLBACK_CODES)[Math.floor(Math.random() * (AREA_CODES[state] ? AREA_CODES[state].length : FALLBACK_CODES.length))];

const FIRST_NAMES = [
  'James', 'Maria', 'Robert', 'Linda', 'Michael', 'Patricia', 'William', 'Jennifer', 'David', 'Elizabeth',
  'Richard', 'Barbara', 'Joseph', 'Susan', 'Thomas', 'Karen', 'Charles', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Sandra', 'Anthony', 'Ashley', 'Mark', 'Kimberly', 'Donald', 'Emily', 'Steven', 'Jessica',
  'Andrew', 'Margaret', 'Joshua', 'Melissa', 'Kevin', 'Angela', 'Brian', 'Sarah', 'George', 'Laura',
  'Marcus', 'Diego', 'Hassan', 'Chen', 'Priya', 'Fatima', 'Ngoc', 'Omar', 'Yuki', 'Alejandra',
  'Tyler', 'Brittany', 'Gabriela', 'Kwame', 'Sofia', 'Lars', 'Rosa', 'Dmitri', 'Aisha', 'Ming',
  'Victor', 'Isabella', 'Pedro', 'Nadia', 'Raymond', 'Eduardo', 'Lily', 'Samira', 'Jonathan', 'Grace',
];
const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
  'Gomez', 'Phillips', 'Okafor', 'Kowalski', 'Tanaka', 'Silva', 'Ivanov', 'Mueller', 'Costa', 'Petrov',
  'Haddad', 'Choi', 'Rahman', 'Castro', 'Ito', 'Fuentes', 'Khan', 'Peterson', 'Baxter', 'Ellis',
];
const EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'proton.me', 'aol.com', 'zoho.com', 'gmx.com', 'hey.com'];

const SOURCE_POOL = ['facebook', 'facebook', 'facebook', 'website', 'website', 'webhook', 'webhook', 'ghl', 'ghl', 'form', 'form', 'api', 'manual'];

const REASONINGS = [
  'Complete contact details with a valid phone and strong campaign fit.',
  'High-intent submission; budget and product interest clearly stated.',
  'Verified contact info with active engagement on the landing page.',
  'Good match for the buyer vertical; response looks genuine.',
  'Incomplete details but plausible source traffic and recent activity.',
  'Low signal: repeated submission pattern with thin qualifying data.',
  'Fresh lead with strong geographic alignment to the active verticals.',
  'Moderate conversion probability based on completeness and source quality.',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function scoreBand() {
  const r = Math.random();
  if (r < 0.15) return randInt(18, 40);
  if (r < 0.6) return randInt(40, 70);
  if (r < 0.9) return randInt(70, 90);
  return randInt(90, 98);
}
function genE164Phone(state, taken) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const p = `+1${areaCodeFor(state)}${String(randInt(2, 9))}${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`;
    if (!taken || !taken.has(p.slice(-10))) return p;
  }
  return `+1${areaCodeFor(state)}${String(randInt(2, 9))}${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`;
}
function genEmail(norm) {
  return `${pick(FIRST_NAMES)}.${pick(LAST_NAMES)}${String(randInt(1, 999))}.${String(norm)}@${pick(EMAIL_DOMAINS)}`.toLowerCase();
}
function distStates(uniqueCount) {
  const counts = {};
  for (const s of STATES) counts[s] = BASE_PER_STATE;
  let remaining = uniqueCount - STATES.length * BASE_PER_STATE;
  const totalW = STATES.reduce((sum, s) => sum + STATE_WEIGHT[s], 0);
  if (remaining > 0) {
    const frac = {};
    let intSum = 0;
    for (const s of STATES) {
      const f = (remaining * STATE_WEIGHT[s]) / totalW;
      const q = Math.floor(f);
      counts[s] += q;
      frac[s] = f - q;
      intSum += q;
    }
    let left = remaining - intSum;
    while (left > 0) {
      let best = STATES[0];
      for (const s of STATES) if (frac[s] > frac[best]) best = s;
      counts[best] += 1;
      frac[best] = 0;
      left -= 1;
    }
  }
  const out = [];
  for (const s of STATES) for (let i = 0; i < counts[s]; i += 1) out.push(s);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}
function rawPayloadOf(lead, extra) {
  return {
    first_name: lead.name.split(' ')[0],
    last_name: lead.name.split(' ').slice(1).join(' '),
    email: lead.email,
    phone: lead.rawPhone,
    state: lead.state,
    source: lead.source,
    campaign_id: lead.campaignId.toString(),
    submitted_at: lead.createdAt.toISOString(),
    ...extra,
  };
}

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.mongo.uri);
  console.log('Connected.\n');

  const Tenant = mongoose.model('Tenant');
  const User = mongoose.model('User');
  const Campaign = mongoose.model('Campaign');
  const Lead = mongoose.model('Lead');

  let tenant = await Tenant.findOne({ slug: TENANT_SLUG });
  if (!tenant) tenant = await Tenant.create({ name: 'Default Workspace', slug: TENANT_SLUG });
  if (tenant.status !== 'active') {
    tenant.status = 'active';
    await tenant.save();
  }
  console.log(`Tenant: ${tenant.slug} (${tenant._id})`);

  let campaign = await Campaign.findOne({ tenantId: tenant._id, name: CAMPAIGN_NAME });
  if (!campaign) {
    campaign = await Campaign.create({
      name: CAMPAIGN_NAME,
      description: 'Seed data for testing and demo',
      source: 'webhook',
      routingMode: 'round_robin',
      costPerLead: 12,
      dedupWindowHours: 720,
      duplicateHandling: 'reject',
      status: 'active',
      tenantId: tenant._id,
    });
    console.log(`Created active campaign: ${CAMPAIGN_NAME} (${campaign._id})`);
  } else {
    console.log(`Using campaign: ${campaign.name} (${campaign._id}, ${campaign.status})`);
  }

  const admin = await User.findOne({ tenantId: tenant._id, role: 'super_admin', status: 'active' })
    .select('_id').lean();
  const createdBy = admin ? admin._id : undefined;

  const existing = await Lead.countDocuments({ tenantId: tenant._id });
  if (existing > 0) {
    if (RESET) {
      await Lead.deleteMany({ tenantId: tenant._id });
      console.log(`Reset: removed ${existing} existing leads.\n`);
    } else if (!FORCE) {
      console.log(`Tenant already has ${existing} leads. Refusing to double-seed.`);
      console.log('Re-run with SEED_RESET=1 to replace the dataset, or SEED_FORCE=1 to append.');
      await mongoose.disconnect();
      return;
    }
  }

  const dupPct = randInt(DUP_PCT_MIN, DUP_PCT_MAX);
  const dupCount = Math.round((SEED_COUNT * dupPct) / 100);
  const uniqueCount = SEED_COUNT - dupCount;
  const now = Date.now();

  const existingKeys = await Lead.find({ tenantId: tenant._id, isDuplicate: false })
    .select('emailNormalized phoneNormalized').lean();
  const takenEmails = new Set(existingKeys.map((l) => l.emailNormalized).filter(Boolean));
  const takenPhones = new Set(existingKeys.map((l) => l.phoneNormalized).filter(Boolean));

  const stateList = distStates(uniqueCount);
  const uniques = [];
  for (let i = 0; i < uniqueCount; i += 1) {
    const state = stateList[i];
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    let email = `${name.toLowerCase().replace(/[^a-z]/g, '.')}${i + 1}@${pick(EMAIL_DOMAINS)}`;
    let emailNorm = normalizeEmailForDedup(email);
    let attempts = 0;
    while (emailNorm && takenEmails.has(emailNorm) && attempts < 10) {
      email = `${name.toLowerCase().replace(/[^a-z]/g, '.')}${i + 1}.${randInt(10, 999)}@${pick(EMAIL_DOMAINS)}`;
      emailNorm = normalizeEmailForDedup(email);
      attempts += 1;
    }
    const phone = genE164Phone(state, takenPhones);
    takenEmails.add(emailNorm);
    takenPhones.add(phone.slice(-10));

    const scored = Math.random() < 0.6;
    const createdAt = new Date(now - randInt(0, 29) * 86400000 - randInt(0, 23) * 3600000 - randInt(0, 59) * 60000);
    const lead = {
      _id: new mongoose.Types.ObjectId(),
      name,
      email,
      phone,
      emailNormalized: emailNorm,
      phoneNormalized: phone.slice(-10),
      state,
      stateRaw: state,
      source: pick(SOURCE_POOL),
      campaignId: campaign._id,
      tenantId: tenant._id,
      createdBy,
      status: scored ? 'unassigned' : 'new',
      isDuplicate: false,
      score: scored ? scoreBand() : null,
      scoreReasoning: scored ? pick(REASONINGS) : '',
      scoredAt: scored ? new Date(createdAt.getTime() + randInt(1, 30) * 60000) : undefined,
      createdAt,
      updatedAt: createdAt,
    };
    lead.rawPhone = `(${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;
    const extras = {};
    if (Math.random() < 0.4) extras.budget = `$${randInt(1, 60)}k`;
    if (Math.random() < 0.3) extras.interest = pick(['Auto', 'Home', 'Health', 'Business', 'Life', 'Travel']);
    if (Math.random() < 0.25) extras.message = 'Please contact me with more details.';
    if (Math.random() < 0.2) extras.referrer = pick(['google', 'facebook', 'partner-site', 'direct']);
    lead.rawPayload = rawPayloadOf(lead, extras);
    uniques.push(lead);
  }

  const emailIndex = {};
  const phoneIndex = {};
  for (const u of uniques) {
    if (u.emailNormalized) emailIndex[u.emailNormalized] = u;
    if (u.phoneNormalized) phoneIndex[u.phoneNormalized] = u;
  }

  const duplicates = [];
  for (let i = 0; i < dupCount; i += 1) {
    const byEmail = Math.random() < 0.5;
    const src = pick(uniques);
    const createdAt = new Date(src.createdAt.getTime() + randInt(2, 180) * 60000);
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    if (byEmail) {
      const phone = genE164Phone(Math.random() < 0.6 ? src.state : pick(STATES), takenPhones);
      takenPhones.add(phone.slice(-10));
      duplicates.push({
        _id: new mongoose.Types.ObjectId(),
        name,
        email: src.email,
        phone,
        emailNormalized: src.emailNormalized,
        phoneNormalized: phone.slice(-10),
        state: src.state,
        stateRaw: src.state,
        source: src.source,
        campaignId: campaign._id,
        tenantId: tenant._id,
        createdBy,
        status: 'duplicate',
        isDuplicate: true,
        duplicateOf: src._id,
        score: null,
        scoreReasoning: '',
        createdAt,
        updatedAt: createdAt,
        rawPhone: `(${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`,
        rawPayload: {
          first_name: name.split(' ')[0],
          last_name: name.split(' ').slice(1).join(' '),
          email: src.email,
          phone: `(${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`,
          state: src.state,
          source: src.source,
          campaign_id: campaign._id.toString(),
          submitted_at: createdAt.toISOString(),
        },
      });
    } else {
      let email = genEmail(randInt(100, 999));
      let emailNorm = normalizeEmailForDedup(email);
      let attempts = 0;
      while (takenEmails.has(emailNorm) && attempts < 10) {
        email = genEmail(randInt(100, 999));
        emailNorm = normalizeEmailForDedup(email);
        attempts += 1;
      }
      takenEmails.add(emailNorm);
      duplicates.push({
        _id: new mongoose.Types.ObjectId(),
        name,
        email,
        phone: src.phone,
        emailNormalized: emailNorm,
        phoneNormalized: src.phoneNormalized,
        state: src.state,
        stateRaw: src.state,
        source: src.source,
        campaignId: campaign._id,
        tenantId: tenant._id,
        createdBy,
        status: 'duplicate',
        isDuplicate: true,
        duplicateOf: src._id,
        score: null,
        scoreReasoning: '',
        createdAt,
        updatedAt: createdAt,
        rawPhone: src.rawPhone,
        rawPayload: {
          first_name: name.split(' ')[0],
          last_name: name.split(' ').slice(1).join(' '),
          email,
          phone: src.rawPhone,
          state: src.state,
          source: src.source,
          campaign_id: campaign._id.toString(),
          submitted_at: createdAt.toISOString(),
        },
      });
    }
  }

  const all = [...uniques, ...duplicates].map((d) => {
    if (d.state) d.state = normalizeState(d.state) || d.state.toUpperCase();
    return d;
  });

  console.log(`Inserting ${all.length} leads (${uniqueCount} unique + ${dupCount} duplicates, ${dupPct}%).\n`);
  const start = Date.now();
  const result = await Lead.insertMany(all, { ordered: false });
  const ms = Date.now() - start;

  const statusCounts = {};
  const sourceCounts = {};
  const stateCounts = {};
  for (const l of all) {
    statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
    sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1;
    stateCounts[l.state] = (stateCounts[l.state] || 0) + 1;
  }

  console.log(`Done in ${ms}ms — inserted ${result.length} leads for tenant ${tenant.slug}`);
  console.log(`  states covered:   ${Object.keys(stateCounts).length}/51`);
  console.log(`  status:           ${Object.entries(statusCounts).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  console.log(`  sources:          ${Object.entries(sourceCounts).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  console.log(`  duplicates:       ${dupCount} (${((dupCount / SEED_COUNT) * 100).toFixed(1)}% of ${SEED_COUNT})`);
  console.log(`  scored leads:     ${all.filter((l) => l.status === 'unassigned').length}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});