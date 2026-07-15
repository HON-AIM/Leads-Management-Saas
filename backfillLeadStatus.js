/**
 * One-time backfill script.
 *
 * Bug 1: Fixes Lead.status stuck at 'assigned' by looking up each lead's
 *         LeadAssignment and updating the Lead to match.
 *
 * Bug 4: Swaps cost/revenue on every existing LeadAssignment where the
 *         values were inverted (buyer.pricePerLead was stored as cost and
 *         campaign.costPerLead was stored as revenue).
 *
 * Usage:  node backfillLeadStatus.js
 *         Review the printed summary, then type "yes" to confirm.
 *
 * SAFE TO RUN MULTIPLE TIMES — idempotent. Already-correct records are skipped.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lead-distribution';

const Lead = require('./src/models/Lead');
const LeadAssignment = require('./src/models/LeadAssignment');
const Campaign = require('./src/models/Campaign');
const Buyer = require('./src/models/Buyer');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function analyzeLeadStatus() {
  console.log('\n=== BUG 1: Backfill Lead.status ===\n');

  const stuckLeads = await Lead.find({ status: 'assigned' }).lean();
  console.log(`Found ${stuckLeads.length} leads with status "assigned"`);

  if (stuckLeads.length === 0) {
    console.log('Nothing to fix for Lead.status.\n');
    return { toFix: [], noAssignment: 0, pending: 0 };
  }

  const toFix = [];
  let noAssignment = 0;
  let pending = 0;

  for (const lead of stuckLeads) {
    const assignment = await LeadAssignment.findOne({ leadId: lead._id })
      .sort({ createdAt: -1 })
      .lean();

    if (!assignment) {
      noAssignment++;
      continue;
    }

    if (assignment.status === 'delivered' || assignment.status === 'failed') {
      toFix.push({ leadId: lead._id.toString(), leadName: lead.name, newStatus: assignment.status });
    } else {
      pending++;
    }
  }

  if (toFix.length > 0) {
    console.log(`\nWill update ${toFix.length} leads:`);
    for (const f of toFix) {
      console.log(`  - ${f.leadName || f.leadId}: assigned -> ${f.newStatus}`);
    }
  }

  console.log(`\nSkipped: ${pending} (assignment still pending/returned), ${noAssignment} (no assignment found)`);
  return { toFix, noAssignment, pending };
}

async function analyzeCostRevenue() {
  console.log('\n=== BUG 4: Swap cost/revenue on LeadAssignments ===\n');

  const allAssignments = await LeadAssignment.find({}).lean();
  console.log(`Found ${allAssignments.length} total LeadAssignment records`);

  if (allAssignments.length === 0) {
    console.log('No assignments to fix.\n');
    return { toFix: [], skipped: 0 };
  }

  const leadIds = [...new Set(allAssignments.map((a) => a.leadId.toString()))];
  const buyerIds = [...new Set(allAssignments.map((a) => a.buyerId.toString()))];
  const campaignIds = [...new Set(allAssignments.map((a) => a.campaignId?.toString()).filter(Boolean))];

  const [leads, buyers, campaigns] = await Promise.all([
    Lead.find({ _id: { $in: leadIds } }).lean(),
    Buyer.find({ _id: { $in: buyerIds } }).lean(),
    Campaign.find({ _id: { $in: campaignIds } }).lean(),
  ]);

  const leadMap = new Map(leads.map((l) => [l._id.toString(), l]));
  const buyerMap = new Map(buyers.map((b) => [b._id.toString(), b]));
  const campaignMap = new Map(campaigns.map((c) => [c._id.toString(), c]));

  const toFix = [];
  let skipped = 0;

  for (const assignment of allAssignments) {
    const buyer = buyerMap.get(assignment.buyerId.toString());
    const campaign = campaignMap.get(assignment.campaignId?.toString());

    if (!buyer || !campaign) {
      skipped++;
      continue;
    }

    const correctCost = campaign.costPerLead || 0;
    const correctRevenue = buyer.pricePerLead || 0;

    if (assignment.cost === correctCost && assignment.revenue === correctRevenue) {
      skipped++;
      continue;
    }

    toFix.push({
      assignmentId: assignment._id.toString(),
      leadName: leadMap.get(assignment.leadId.toString())?.name || assignment.leadId.toString(),
      oldCost: assignment.cost,
      oldRevenue: assignment.revenue,
      newCost: correctCost,
      newRevenue: correctRevenue,
    });
  }

  if (toFix.length > 0) {
    console.log(`\nWill swap cost/revenue on ${toFix.length} assignments:`);
    for (const f of toFix.slice(0, 20)) {
      console.log(`  - ${f.leadName}: cost $${f.oldCost} -> $${f.newCost}, revenue $${f.oldRevenue} -> $${f.newRevenue}`);
    }
    if (toFix.length > 20) {
      console.log(`  ... and ${toFix.length - 20} more`);
    }
  }

  console.log(`\nSkipped: ${skipped} (already correct or missing buyer/campaign)`);
  return { toFix, skipped };
}

async function applyLeadStatusFix(toFix) {
  let count = 0;
  for (const f of toFix) {
    await Lead.findByIdAndUpdate(f.leadId, { status: f.newStatus });
    count++;
  }
  return count;
}

async function applyCostRevenueFix(toFix) {
  let count = 0;
  for (const f of toFix) {
    await LeadAssignment.findByIdAndUpdate(f.assignmentId, {
      cost: f.newCost,
      revenue: f.newRevenue,
    });
    count++;
  }
  return count;
}

async function main() {
  console.log('========================================');
  console.log('  One-Time Backfill Script');
  console.log('  Bugs #1 (Lead.status) & #4 (cost/revenue)');
  console.log('========================================');
  console.log(`\nConnecting to: ${MONGO_URI}`);

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  const leadResult = await analyzeLeadStatus();
  const costResult = await analyzeCostRevenue();

  console.log('\n========================================');
  console.log('  REVIEW COMPLETE');
  console.log('========================================');

  const forceYes = process.argv.includes('--yes');

  if (!forceYes) {
    const answer = await ask('\nType "yes" to apply these changes, or anything else to abort: ');
    if (answer.trim().toLowerCase() !== 'yes') {
      console.log('Aborted. No changes were made.');
      rl.close();
      await mongoose.disconnect();
      process.exit(0);
    }
  } else {
    console.log('\n--yes flag detected, auto-confirming.');
  }

  console.log('\nApplying changes...');

  const leadFixed = await applyLeadStatusFix(leadResult.toFix);
  const costFixed = await applyCostRevenueFix(costResult.toFix);

  console.log('\n========================================');
  console.log('  RESULTS');
  console.log('========================================');
  console.log(`Lead.status corrected:  ${leadFixed} leads updated`);
  console.log(`Cost/revenue corrected: ${costFixed} assignments updated`);
  console.log('\nDone.');
  rl.close();
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  rl.close();
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});
