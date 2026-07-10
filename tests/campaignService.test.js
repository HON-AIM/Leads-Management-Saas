const test = require('node:test');
const assert = require('node:assert/strict');
const { getCampaignArchivePlan } = require('../services/campaignService');

test('active campaigns are archived instead of hard-deleted', () => {
  const plan = getCampaignArchivePlan({ status: 'active', isArchived: false });
  assert.equal(plan.action, 'archive');
  assert.equal(plan.updates.status, 'archived');
  assert.equal(plan.updates.isArchived, true);
});

test('archived campaigns can be hard-deleted', () => {
  const plan = getCampaignArchivePlan({ status: 'archived', isArchived: true });
  assert.equal(plan.action, 'delete');
  assert.equal(plan.hardDelete, true);
});
