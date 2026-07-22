require('dotenv').config();
const http = require('http');

const BASE = 'http://localhost:5000';
const CAMPAIGN_ID = '6a542f48c119d173860ff06b';

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(path, BASE);
    const req = http.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers } }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch(e) { resolve({ raw: buf }); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    http.get(url, { headers }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch(e) { resolve({ raw: buf }); } });
    }).on('error', reject);
  });
}

async function run() {
  // Login
  const login = await post('/api/auth/login', { email: 'admin@leaddistro.com', password: 'Admin123!', tenantSlug: 'default' });
  const token = login.data.accessToken;
  const auth = { Authorization: `Bearer ${token}` };

  // Get API key
  const keyResp = await post('/api/auth/api-key/generate', {}, auth);
  const apiKey = keyResp.data.apiKey;

  const ingestHeaders = { 'x-api-key': apiKey, 'x-supplier-key': 'sk_93fa9b96dad9ec37d5f1badd085a96484dd11cf28417d802' };

  // 20 test leads
  const leads = [
    // 1-5: TX leads → ISRAEL ADEOSUN (no-op delivery)
    { first_name: 'Alice', last_name: 'Johnson', email: 'alice.johnson@test.com', phone: '5125551001', state: 'TX', source: 'test' },
    { first_name: 'Bob', last_name: 'Smith', email: 'bob.smith@test.com', phone: '5125551002', state: 'TX', source: 'test' },
    { first_name: 'Carol', last_name: 'Williams', email: 'carol.williams@test.com', phone: '5125551003', state: 'TX', source: 'test' },
    { first_name: 'David', last_name: 'Brown', email: 'david.brown@test.com', phone: '5125551004', state: 'Texas', source: 'test' },
    { first_name: 'Eve', last_name: 'Davis', email: 'eve.davis@test.com', phone: '5125551005', state: 'T.X.', source: 'test' },

    // 6-9: CA leads → JOHN DOE (no-op delivery)
    { first_name: 'Frank', last_name: 'Miller', email: 'frank.miller@test.com', phone: '4155551006', state: 'CA', source: 'test' },
    { first_name: 'Grace', last_name: 'Wilson', email: 'grace.wilson@test.com', phone: '4155551007', state: 'CA', source: 'test' },
    { first_name: 'Hank', last_name: 'Moore', email: 'hank.moore@test.com', phone: '4155551008', state: 'California', source: 'test' },
    { first_name: 'Ivy', last_name: 'Taylor', email: 'ivy.taylor@test.com', phone: '4155551009', state: 'C A', source: 'test' },

    // 10-12: NY leads → PURE TEST (no-op delivery)
    { first_name: 'Jack', last_name: 'Anderson', email: 'jack.anderson@test.com', phone: '2125551010', state: 'NY', source: 'test' },
    { first_name: 'Kate', last_name: 'Thomas', email: 'kate.thomas@test.com', phone: '2125551011', state: 'NY', source: 'test' },
    { first_name: 'Leo', last_name: 'Jackson', email: 'leo.jackson@test.com', phone: '2125551012', state: 'New York', source: 'test' },

    // 13-14: FL leads → no eligible buyer (unassigned)
    { first_name: 'Mia', last_name: 'White', email: 'mia.white@test.com', phone: '3055551013', state: 'FL', source: 'test' },
    { first_name: 'Noah', last_name: 'Harris', email: 'noah.harris@test.com', phone: '3055551014', state: 'FL', source: 'test' },

    // 15-16: Duplicates of lead #1
    { first_name: 'Alice', last_name: 'Dup1', email: 'alice.johnson@test.com', phone: '5125551001', state: 'TX', source: 'test' },
    { first_name: 'Alice', last_name: 'Dup2', email: 'alice.johnson@test.com', phone: '5125559999', state: 'TX', source: 'test' },

    // 17-18: FL with unusual state formatting → unassigned
    { first_name: 'Olivia', last_name: 'Martin', email: 'olivia.martin@test.com', phone: '3055551017', state: 'F.L.', source: 'test' },
    { first_name: 'Paul', last_name: 'Thompson', email: 'paul.thompson@test.com', phone: '3055551018', state: 'florida', source: 'test' },

    // 19: TX lead (for manual reassign test later)
    { first_name: 'Quinn', last_name: 'Garcia', email: 'quinn.garcia@test.com', phone: '5125551019', state: 'TX', source: 'test' },

    // 20: TX lead (for manual reassign test later)
    { first_name: 'Rachel', last_name: 'Martinez', email: 'rachel.martinez@test.com', phone: '5125551020', state: 'TX', source: 'test' },
  ];

  console.log(`\n=== CREATING ${leads.length} TEST LEADS ===\n`);

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const url = `/api/ingest?tenantSlug=default&campaignId=${CAMPAIGN_ID}`;
    try {
      const resp = await post(url, lead, ingestHeaders);
      const r = resp.data?.results?.[0];
      if (r) {
        const detail = r.buyer ? ` buyer=${r.buyer}` : '';
        const reason = r.reason ? ` reason="${r.reason}"` : '';
        console.log(`Lead ${i + 1}: ${r.status}${detail}${reason} id=${r.id}`);
      } else {
        console.log(`Lead ${i + 1}: UNEXPECTED - ${JSON.stringify(resp).substring(0, 200)}`);
      }
    } catch (e) {
      console.log(`Lead ${i + 1}: ERROR - ${e.message}`);
    }
  }

  // Now verify: check all test leads in DB
  console.log('\n=== VERIFYING ALL LEADS ===\n');
  const verifyHeaders = auth;
  const leadsResp = await get('/api/leads?limit=100&search=test', verifyHeaders);
  const allLeads = leadsResp.data || [];
  const testLeads = allLeads.filter(l => l.source === 'test');
  console.log(`Total test leads in DB: ${testLeads.length}`);
  testLeads.forEach((l, i) => {
    const campaignName = l.campaignId?.name || 'N/A';
    console.log(`${i + 1}. ${l.name} | state=${l.state}(raw=${l.stateRaw || '?'}) | status=${l.status} | dup=${l.isDuplicate} | campaign=${campaignName}`);
  });

  // Check Dashboard overview
  console.log('\n=== DASHBOARD OVERVIEW ===\n');
  const dashResp = await get('/api/dashboard/overview', verifyHeaders);
  const dash = dashResp.data;
  console.log(`Total Leads: ${dash.totalLeads}`);
  console.log(`Active Buyers: ${dash.activeBuyers}`);
  console.log(`Lead Status: new=${dash.leads?.new} assigned=${dash.leads?.assigned} delivered=${dash.leads?.delivered} failed=${dash.leads?.failed} duplicate=${dash.leads?.duplicate} unassigned=${dash.leads?.unassigned}`);
  console.log(`Delivery: total=${dash.delivery?.total} delivered=${dash.delivery?.delivered} failed=${dash.delivery?.failed} returned=${dash.delivery?.returned}`);

  // Check Reports overview
  console.log('\n=== REPORTS OVERVIEW ===\n');
  const reportsResp = await get('/api/reports/overview', verifyHeaders);
  const reports = reportsResp.data;
  console.log(`Total Leads: ${reports.totalLeads}`);
  console.log(`Total Assignments: ${reports.totalAssignments}`);
  console.log(`Delivered: ${reports.delivered}`);
  console.log(`Failed: ${reports.failed}`);
  console.log(`Success Rate: ${(reports.successRate * 100).toFixed(1)}%`);
  console.log(`Duplicate Rate: ${(reports.duplicateRate * 100).toFixed(1)}%`);
  console.log(`Avg Delivery: ${Math.round(reports.avgDeliveryMs)}ms`);

  // Check Delivery stats
  console.log('\n=== DELIVERY STATS ===\n');
  const delStatsResp = await get('/api/delivery-logs/stats', verifyHeaders);
  const delStats = delStatsResp.data;
  console.log(`Total: ${delStats.total}`);
  console.log(`Success: ${delStats.success}`);
  console.log(`Failed: ${delStats.failed}`);

  // Check Reports buyer distribution
  console.log('\n=== REPORTS BUYER DISTRIBUTION ===\n');
  const buyerDistResp = await get('/api/reports/buyer-distribution', verifyHeaders);
  (buyerDistResp.data || []).forEach(b => {
    const rate = b.total > 0 ? ((b.delivered / b.total) * 100).toFixed(0) : 0;
    console.log(`${b.name}: total=${b.total} delivered=${b.delivered} failed=${b.failed} rate=${rate}%`);
  });

  // Check Reports campaign performance
  console.log('\n=== REPORTS CAMPAIGN PERFORMANCE ===\n');
  const campPerfResp = await get('/api/reports/campaign-performance', verifyHeaders);
  (campPerfResp.data || []).forEach(c => {
    console.log(`${c.name}: total=${c.total} delivered=${c.delivered} failed=${c.failed} rate=${(c.successRate * 100).toFixed(0)}%`);
  });
}

run().catch(e => { console.error(e); process.exit(1); });
