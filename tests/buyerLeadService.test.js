const test = require('node:test');
const assert = require('node:assert/strict');
const { buildBuyerLeadFilter, summarizeBuyerLeadStats } = require('../services/buyerLeadService');

test('buildBuyerLeadFilter applies search and status filters for buyer leads', () => {
  const filter = buildBuyerLeadFilter({
    tenantId: 'tenant-1',
    buyerId: 'buyer-1',
    query: {
      search: 'jane',
      status: 'assigned',
      state: 'TX',
      deliveryStatus: 'delivered',
      source: 'web',
      campaign: 'spring',
    },
  });

  assert.deepEqual(filter, {
    tenantId: 'tenant-1',
    assignedTo: 'buyer-1',
    status: 'assigned',
    state: 'TX',
    deliveryStatus: 'delivered',
    source: 'web',
    campaign: 'spring',
    $or: [
      { name: { $regex: 'jane', $options: 'i' } },
      { email: { $regex: 'jane', $options: 'i' } },
      { phone: { $regex: 'jane', $options: 'i' } },
      { state: { $regex: 'jane', $options: 'i' } },
      { source: { $regex: 'jane', $options: 'i' } },
      { campaign: { $regex: 'jane', $options: 'i' } },
    ],
  });
});

test('summarizeBuyerLeadStats groups lead progress by status', () => {
  const summary = summarizeBuyerLeadStats([
    { status: 'assigned', deliveryStatus: 'pending' },
    { status: 'assigned', deliveryStatus: 'delivered' },
    { status: 'pending', deliveryStatus: 'pending' },
    { status: 'converted', deliveryStatus: 'delivered' },
  ]);

  assert.deepEqual(summary, {
    total: 4,
    pending: 2,
    inProgress: 1,
    delivered: 2,
    converted: 1,
  });
});
