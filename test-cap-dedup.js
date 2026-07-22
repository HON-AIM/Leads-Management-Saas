const http = require('http');

const CAMPAIGN_ID = '6a542f48c119d173860ff06b';
const API_KEY = '6cdc86c448753befbe062fb982121fc081ab8834d14ef519';
const SUPPLIER_KEY = 'test-supplier-key';

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
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

function out(s) { process.stdout.write(s + '\n'); }

async function main() {
  const ts = Date.now();

  out('=== CAP + DEDUP LIVE TEST ===\n');

  // --- PHASE 1: Ingest 30 unique leads ---
  out('--- Phase 1: Ingest 30 unique leads (total cap = 23, expect overflow to ISRAEL) ---');
  const batch1 = [];
  for (let i = 0; i < 30; i++) {
    batch1.push({
      name: `CapTest${ts}_${i}`,
      email: `captest${ts}-${i}@verify.com`,
      phone: `+1310555${String(7000 + i).padStart(4, '0')}`,
      state: 'TX',
      source: 'cap-test'
    });
  }
  const res1 = await ingestBatch(batch1);
  const r1 = res1.data?.results || [];
  const created1 = r1.filter(r => r.status === 'processing' || r.status === 'queued');
  const dupe1 = r1.filter(r => r.status === 'duplicate');
  const err1 = r1.filter(r => r.status === 'error');
  out(`  Ingested: ${r1.length} total, ${created1.length} processing, ${dupe1.length} dupes, ${err1.length} errors`);

  // Wait for inline processing
  await new Promise(r => setTimeout(r, 8000));

  // --- Check buyer state ---
  const checkBuyers = async (label) => {
    const res = await new Promise((resolve, reject) => {
      const token = require('fs').readFileSync(require('path').join(process.env.TEMP, 'token.txt'), 'utf8').trim();
      const req = http.request({
        hostname: 'localhost', port: 5000,
        path: `/api/buyers`,
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      }, (res) => { let body = ''; res.on('data', c => body += c); res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({raw:body}); } }); });
      req.on('error', reject); req.end();
    });
    const buyers = res.data?.data || res.data || [];
    out(`\n  ${label}:`);
    buyers.forEach(b => {
      out(`    ${b.name}: received=${b.leadsReceived} (cap=${b.leadCap || 'unlimited'})`);
    });
    return buyers;
  };

  const buyersAfter1 = await checkBuyers('After Phase 1');

  // --- PHASE 2: Re-ingest exact same batch (should all be dupes) ---
  out('\n--- Phase 2: Re-ingest same 30 leads (expect all dupes) ---');
  const res2 = await ingestBatch(batch1);
  const r2 = res2.data?.results || [];
  const created2 = r2.filter(r => r.status === 'processing' || r.status === 'queued');
  const dupe2 = r2.filter(r => r.status === 'duplicate');
  out(`  Ingested: ${r2.length} total, ${created2.length} processing, ${dupe2.length} dupes`);
  out(`  ${dupe2.length === 30 ? 'PASS: All 30 caught as duplicates' : 'FAIL: Expected 30 dupes, got ' + dupe2.length}`);

  await new Promise(r => setTimeout(r, 3000));

  // --- PHASE 3: Phone-based dupes ---
  out('\n--- Phase 3: 10 new leads + 5 phone dupes (same phones as Phase 1 leads 0-4) ---');
  const batch3 = [];
  for (let i = 0; i < 10; i++) {
    batch3.push({
      name: `PhaseC${ts}_${i}`,
      email: `phasec${ts}-${i}@verify.com`,
      phone: `+1310555${String(8000 + i).padStart(4, '0')}`,
      state: 'CA',
      source: 'cap-test'
    });
  }
  for (let i = 0; i < 5; i++) {
    batch3.push({
      name: `PhoneDupe${ts}_${i}`,
      email: `phonedupe${ts}-${i}@verify.com`,
      phone: `+1310555${String(7000 + i).padStart(4, '0')}`,
      state: 'CA',
      source: 'cap-test'
    });
  }
  const res3 = await ingestBatch(batch3);
  const r3 = res3.data?.results || [];
  const created3 = r3.filter(r => r.status === 'processing' || r.status === 'queued');
  const dupe3 = r3.filter(r => r.status === 'duplicate');
  out(`  Ingested: ${r3.length} total, ${created3.length} processing, ${dupe3.length} dupes`);
  out(`  ${created3.length === 10 ? 'PASS: 10 new leads created' : 'FAIL: Expected 10 new, got ' + created3.length}`);
  out(`  ${dupe3.length === 5 ? 'PASS: 5 phone dupes caught' : 'FAIL: Expected 5 phone dupes, got ' + dupe3.length}`);

  await new Promise(r => setTimeout(r, 8000));

  // --- FINAL STATE ---
  const buyersFinal = await checkBuyers('FINAL buyer state');

  // --- CAP VERIFICATION ---
  out('\n=== CAP VERIFICATION ===');
  for (const b of buyersFinal) {
    if (b.leadCap > 0 && b.leadsReceived > b.leadCap) {
      out(`  FAIL: ${b.name} received ${b.leadsReceived} but cap is ${b.leadCap}`);
    } else if (b.leadCap > 0) {
      out(`  OK: ${b.name} received ${b.leadsReceived} / cap ${b.leadCap} (${b.leadsReceived <= b.leadCap ? 'within cap' : 'OVER CAP!'})`);
    } else {
      out(`  OK: ${b.name} received ${b.leadsReceived} / unlimited`);
    }
  }

  // --- DEDUP VERIFICATION ---
  out('\n=== DEDUP VERIFICATION ===');
  const totalCreated = created1.length + created2.length + created3.length;
  const totalDupes = dupe1.length + dupe2.length + dupe3.length;
  out(`  Total created: ${totalCreated}`);
  out(`  Total dupes caught: ${totalDupes}`);

  out('\n=== DONE ===');
}

main().catch(e => out('FATAL: ' + e.message));
