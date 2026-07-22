const http = require('http');
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(process.env.TEMP, 'token.txt');
const CAMPAIGN_ID = '6a542f48c119d173860ff06b';
const API_KEY = '6cdc86c448753befbe062fb982121fc081ab8834d14ef519';
const SUPPLIER_KEY = 'test-supplier-key';

function getToken() { try { return fs.readFileSync(TOKEN_PATH, 'utf8').trim(); } catch { return ''; } }

function ingestBatch(leads) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(leads);
    const req = http.request({
      hostname: 'localhost', port: 5000,
      path: `/api/ingest?tenantSlug=default&campaignId=${CAMPAIGN_ID}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, 'x-supplier-key': SUPPLIER_KEY, 'Content-Length': Buffer.byteLength(data) },
    }, (res) => { let body = ''; res.on('data', c => body += c); res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({ raw: body }); } }); });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

function checkBuyers() {
  return new Promise((resolve, reject) => {
    const token = getToken();
    const req = http.request({
      hostname: 'localhost', port: 5000, path: '/api/buyers', method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    }, (res) => { let body = ''; res.on('data', c => body += c); res.on('end', () => { try { const j = JSON.parse(body); resolve(j.data?.data || j.data || []); } catch { resolve([]); } }); });
    req.on('error', reject); req.end();
  });
}

function out(s) { process.stdout.write(s + '\n'); }

async function main() {
  const ts = Date.now();

  // --- Login ---
  const loginData = JSON.stringify({ email: 'admin@leaddistro.com', password: 'Admin123!', tenantSlug: 'default' });
  await new Promise((resolve, reject) => {
    const req = http.request({ hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData) } }, (res) => {
      let body = ''; res.on('data', c => body += c);
      res.on('end', () => { const j = JSON.parse(body); fs.writeFileSync(TOKEN_PATH, j.data.accessToken); resolve(); });
    });
    req.on('error', reject); req.write(loginData); req.end();
  });

  // --- Get existing cap-test leads for dedup test ---
  const existingLeads = [];
  for (let i = 0; i < 5; i++) {
    existingLeads.push({
      name: `CapTest${ts - 1000}_${i}`,
      email: `captest${ts - 1000}-${i}@verify.com`,
      phone: `+1310555${String(7000 + i).padStart(4, '0')}`,
      state: 'TX', source: 'cap-test'
    });
  }

  out('=== PHASE 2: DEDUP TEST ===\n');

  // --- Phase 2: Re-ingest 5 of the Phase 1 leads (email dupes) ---
  out('--- Re-ingest 5 Phase 1 leads (email dupes) ---');
  const res2 = await ingestBatch(existingLeads);
  const r2 = res2.data?.results || [];
  const created2 = r2.filter(r => r.status === 'processing' || r.status === 'queued');
  const dupe2 = r2.filter(r => r.status === 'duplicate');
  out(`  Created: ${created2.length}, Dupes: ${dupe2.length}`);
  out(`  ${dupe2.length === 5 ? 'PASS' : 'FAIL'}: ${dupe2.length}/5 email dupes caught`);

  // --- Phase 3: New leads + phone dupes ---
  out('\n=== PHASE 3: NEW + PHONE DUPES ===\n');
  const batch3 = [];
  for (let i = 0; i < 10; i++) {
    batch3.push({
      name: `PhaseC${ts}_${i}`,
      email: `phasec${ts}-${i}@verify.com`,
      phone: `+1310555${String(8000 + i).padStart(4, '0')}`,
      state: 'CA', source: 'cap-test'
    });
  }
  for (let i = 0; i < 5; i++) {
    batch3.push({
      name: `PhoneDupe${ts}_${i}`,
      email: `phonedupe${ts}-${i}@verify.com`,
      phone: `+1310555${String(7000 + i).padStart(4, '0')}`,
      state: 'CA', source: 'cap-test'
    });
  }

  out('--- 10 new + 5 phone dupes ---');
  const res3 = await ingestBatch(batch3);
  const r3 = res3.data?.results || [];
  const created3 = r3.filter(r => r.status === 'processing' || r.status === 'queued');
  const dupe3 = r3.filter(r => r.status === 'duplicate');
  out(`  Created: ${created3.length}, Dupes: ${dupe3.length}`);
  out(`  ${created3.length === 10 ? 'PASS' : 'FAIL'}: ${created3.length}/10 new leads created`);
  out(`  ${dupe3.length === 5 ? 'PASS' : 'FAIL'}: ${dupe3.length}/5 phone dupes caught`);

  // Wait for all inline processing
  out('\n  Waiting for processing...');
  await new Promise(r => setTimeout(r, 10000));

  // --- Check buyer state after Phase 3 ---
  const buyers3 = await checkBuyers();
  out('\n--- After Phase 3: ---');
  buyers3.forEach(b => {
    const status = b.leadCap > 0 ? `${b.leadsReceived}/${b.leadCap}` : `${b.leadsReceived}/unlimited`;
    const overCap = b.leadCap > 0 && b.leadsReceived > b.leadCap;
    out(`  ${b.name}: ${status}${overCap ? ' OVER CAP!' : ''}`);
  });

  // --- Phase 4: Push past remaining caps ---
  out('\n=== PHASE 4: PUSH PAST ALL CAPS ===\n');
  const batch4 = [];
  for (let i = 0; i < 20; i++) {
    batch4.push({
      name: `PushCap${ts}_${i}`,
      email: `pushcap${ts}-${i}@verify.com`,
      phone: `+1310555${String(9000 + i).padStart(4, '0')}`,
      state: 'NY', source: 'cap-test'
    });
  }

  out('--- Ingest 20 more leads ---');
  const res4 = await ingestBatch(batch4);
  const r4 = res4.data?.results || [];
  const created4 = r4.filter(r => r.status === 'processing' || r.status === 'queued');
  const dupe4 = r4.filter(r => r.status === 'duplicate');
  out(`  Created: ${created4.length}, Dupes: ${dupe4.length}`);

  await new Promise(r => setTimeout(r, 10000));

  // --- FINAL STATE ---
  const buyersFinal = await checkBuyers();
  out('\n--- FINAL BUYER STATE ---');
  buyersFinal.forEach(b => {
    const status = b.leadCap > 0 ? `${b.leadsReceived}/${b.leadCap}` : `${b.leadsReceived}/unlimited`;
    const overCap = b.leadCap > 0 && b.leadsReceived > b.leadCap;
    out(`  ${b.name}: ${status}${overCap ? ' OVER CAP!' : ''}`);
  });

  // --- FINAL VERDICT ---
  out('\n=== CAP VERIFICATION ===');
  let allPass = true;
  for (const b of buyersFinal) {
    if (b.leadCap > 0 && b.leadsReceived > b.leadCap) {
      out(`  FAIL: ${b.name} OVER CAP: ${b.leadsReceived} > ${b.leadCap}`);
      allPass = false;
    } else if (b.leadCap > 0) {
      out(`  PASS: ${b.name} ${b.leadsReceived}/${b.leadCap}`);
    } else {
      out(`  PASS: ${b.name} ${b.leadsReceived}/unlimited (receives overflow)`);
    }
  }

  out('\n=== DONE ===');
}

main().catch(e => out('FATAL: ' + e.message));
