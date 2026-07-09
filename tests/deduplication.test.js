const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldBlockRouting, normalizeEmailForDedup, normalizePhoneForDedup } = require('../services/deduplicationService');

test('blocks duplicate and already-assigned leads from routing', () => {
  assert.equal(shouldBlockRouting({ isDuplicate: true }), true);
  assert.equal(shouldBlockRouting({ ingestionStatus: 'duplicate' }), true);
  assert.equal(shouldBlockRouting({ assignmentStatus: 'assigned', assignedBuyerId: 'buyer-1' }), true);
  assert.equal(shouldBlockRouting({ status: 'pending', ingestionStatus: 'received' }), false);
});

test('normalizes contact values for duplicate matching', () => {
  assert.equal(normalizeEmailForDedup('  User@Example.com  '), 'user@example.com');
  assert.equal(normalizePhoneForDedup('(555) 123-4567'), '5551234567');
  assert.equal(normalizePhoneForDedup('123'), null);
});
