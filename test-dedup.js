const http = require('http');
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(process.env.TEMP, 'token.txt');
const CAMPAIGN_ID = '6a542f48c119d173860ff06b';
const API_KEY = '6cdc86c448753befbe062fb982121fc081ab8834d14ef519';
const SUPPLIER_KEY = 'test-supplier-key';

function getToken() { try { return fs.readFileSync(TOKEN_PATH, 'utf8').trim(); } catch { return ''; } }

function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    const data = body ? JSON.stringify(body) : null;
    const opts = { hostname: 'localhost', port: 5000, path: urlPath, method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const req = http.request(opts, (res) => { let b = ''; res.on('data', c => b += c); res.on('end', () => { try { resolve(JSON.parse(b)); } catch { resolve({ raw: b }); } }); });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
    if (data) req.write(data);
    req.end();
  });
}

function ingestBatch(leads) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    const data = JSON.stringify(leads);
    const req = http.request({
      hostname: 'localhost', port: 5000,
      path: `/api/ingest?tenantSlug=default&campaignId=${CAMPAIGN_ID}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, 'x-supplier-key': SUPPLIER_KEY, 'Content-Length': Buffer.byteLength(data) },
    }, (res) => { let body = ''; res.on('data', c => body += c); res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({ raw: body }); } }); });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

function out(s) { process.stdout.write(s + '\n'); }

async function main() {
  // Login
  const loginData = JSON.stringify({ email: 'admin@leaddistro.com', password: 'Admin123!', tenantSlug: 'default' });
  await new Promise((resolve, reject) => {
    const req = http.request({ hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData) } }, (res) => {
      let body = ''; res.on('data', c => body += c);
      res.on('end', () => { const j = JSON.parse(body); fs.writeFileSync(TOKEN_PATH, j.data.accessToken); resolve(); });
    });
    req.on('error', reject); req.write(loginData); req.end();
  });

  out('=== DEDUP FIX VERIFICATION ===\n');

  // Get current state
  const before = await request('GET', `/api/campaigns/${CAMPAIGN_ID}/stats`);
  out(`Before: ${before.data.totalLeads} leads, ${before.data.totalDelivered} delivered`);

  const ts = Date.now();

  // Ingest 10 unique leads first (batch A)
  out('\n--- Ingesting Batch A: 10 unique leads ---');
  const batchA = [];
  for (let i = 0; i < 10; i++) {
    batchA.push({ name: `DedupTestA${ts}${i}`, email: `dedup-a${ts}-${i}@verify.com`, phone: `+1310555${String(4000 + i).padStart(4, '0')}`, state: 'TX', source: 'dedup-verify' });
  }
  const resA = await ingestBatch(batchA);
  const createdA = (resA.data?.results || []).filter(r => r.status === 'processing' || r.status === 'queued');
  const dupedA = (resA.data?.results || []).filter(r => r.status === 'duplicate');
  out(`  Created: ${createdA.length}, Duplicates: ${dupedA.length}`);

  await new Promise(r => setTimeout(r, 2000));

  // Batch B: exact email dupes of batch A (different names)
  out('\n--- Ingesting Batch B: 10 EXACT DUPLICATES of batch A (email match) ---');
  const batchB = batchA.map((l, i) => ({ name: `DupeB${ts}${i}`, email: l.email, phone: `+1310555${String(5000 + i).padStart(4, '0')}`, state: 'TX', source: 'dedup-verify' }));
  const resB = await ingestBatch(batchB);
  const createdB = (resB.data?.results || []).filter(r => r.status === 'processing' || r.status === 'queued');
  const dupedB = (resB.data?.results || []).filter(r => r.status === 'duplicate');
  out(`  Created (should be 0): ${createdB.length}, Duplicates: ${dupedB.length}`);

  // Batch C: 10 NEW unique + 5 phone dupes (same phone as batch A, different email)
  out('\n--- Ingesting Batch C: 10 NEW + 5 phone dupes ---');
  const batchC = [];
  for (let i = 0; i < 10; i++) {
    batchC.push({ name: `DedupTestC${ts}${i}`, email: `dedup-c${ts}-${i}@verify.com`, phone: `+1310555${String(6000 + i).padStart(4, '0')}`, state: 'CA', source: 'dedup-verify' });
  }
  for (let i = 0; i < 5; i++) {
    batchC.push({ name: `PhoneDupe${ts}${i}`, email: `phonedupe${ts}-${i}@verify.com`, phone: `+1310555${String(4000 + i).padStart(4, '0')}`, state: 'CA', source: 'dedup-verify' });
  }
  const resC = await ingestBatch(batchC);
  const createdC = (resC.data?.results || []).filter(r => r.status === 'processing' || r.status === 'queued');
  const dupedC = (resC.data?.results || []).filter(r => r.status === 'duplicate');
  out(`  Created (should be 10): ${createdC.length}, Duplicates (should be 5): ${dupedC.length}`);

  await new Promise(r => setTimeout(r, 3000));

  // Summary
  const totalCreated = createdA.length + createdB.length + createdC.length;
  const totalDupes = dupedA.length + dupedB.length + dupedC.length;
  out(`\n=== TOTALS ===`);
  out(`Created: ${totalCreated}, Duplicates caught: ${totalDupes}`);
  out(`  Batch A (unique):     ${createdA.length} created`);
  out(`  Batch B (email dupes): ${createdB.length} created, ${dupedB.length} dupes`);
  out(`  Batch C (new+phonedupes): ${createdC.length} created, ${dupedC.length} dupes`);

  out('\n=== VERDICT ===');
  if (createdA.length === 10 && createdB.length === 0 && createdC.length === 10 && dupedC.length === 5) {
    out('DEDUP FIX WORKING: All dedup scenarios passed');
  } else {
    out(`DEDUP ISSUE: Expected A=10, B=0, C=10(5 phone dupes)`);
    out(`  Got A=${createdA.length}, B=${createdB.length}, C=${createdC.length} created, ${dupedC.length} phone dupes`);
  }

  out('\n=== DONE ===');
}

main().catch(e => out('FATAL: ' + e.message));
