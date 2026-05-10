const RoutingState = require('../models/RoutingState');

const LOG_PREFIX = '[RoundRobinState]';

function log(step, details = {}) {
  const ts = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${ts} | Step: ${step}`, details);
}

async function getOrCreateState(tenantId, state) {
  const routingState = await RoutingState.findOneAndUpdate(
    { tenantId, state: state.toUpperCase() },
    { $setOnInsert: { tenantId, state: state.toUpperCase(), lastIndex: 0, version: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return routingState;
}

async function getNextRoundRobinIndex(tenantId, state, buyerCount) {
  if (buyerCount === 0) return -1;

  const routingState = await getOrCreateState(tenantId, state);
  const nextIndex = routingState.lastIndex % buyerCount;

  await RoutingState.findOneAndUpdate(
    { tenantId, state: state.toUpperCase() },
    { $inc: { lastIndex: 1, version: 1 } }
  );

  log('NEXT_INDEX', { state, lastIndex: routingState.lastIndex, nextIndex, buyerCount });
  return nextIndex;
}

async function getNextRoundRobinBuyer(tenantId, state, buyers) {
  if (!buyers || buyers.length === 0) return null;

  const stateUpper = state.toUpperCase();
  const buyerCount = buyers.length;

  if (buyerCount === 0) return null;

  const routingState = await getOrCreateState(tenantId, state);

  const totalBuyers = await RoutingState.findOne({ tenantId, state: stateUpper });

  for (let attempt = 0; attempt < buyerCount; attempt++) {
    const index = (totalBuyers.lastIndex + attempt) % buyerCount;
    const buyer = buyers[index];
    if (buyer) {
      if (attempt > 0) {
        log('SKIP_UNAVAILABLE', { state, attemptedIndex: totalBuyers.lastIndex, chosenIndex: index });
      }
      await RoutingState.findOneAndUpdate(
        { tenantId, state: stateUpper },
        { $inc: { lastIndex: 1 } }
      );
      log('NEXT_BUYER', { state, index, buyerName: buyer.name, buyerId: buyer._id });
      return buyer;
    }
  }

  await RoutingState.findOneAndUpdate(
    { tenantId, state: stateUpper },
    { $inc: { lastIndex: 1 } }
  );

  log('ALL_UNAVAILABLE', { state, buyerCount });
  return null;
}

async function advanceIndex(tenantId, state) {
  await RoutingState.findOneAndUpdate(
    { tenantId, state: state.toUpperCase() },
    { $inc: { lastIndex: 1, version: 1 } }
  );
}

async function peekNextIndex(tenantId, state, buyerCount) {
  if (buyerCount === 0) return -1;

  const routingState = await getOrCreateState(tenantId, state);
  return routingState.lastIndex % buyerCount;
}

async function resetState(tenantId, state) {
  await RoutingState.findOneAndUpdate(
    { tenantId, state: state.toUpperCase() },
    { $set: { lastIndex: 0 }, $inc: { version: 1 } }
  );
  log('RESET', { tenantId, state });
}

async function resetAllForTenant(tenantId) {
  await RoutingState.updateMany(
    { tenantId },
    { $set: { lastIndex: 0 }, $inc: { version: 1 } }
  );
  log('RESET_ALL', { tenantId });
}

async function getStateInfo(tenantId, state) {
  const routingState = await RoutingState.findOne({ tenantId, state: state.toUpperCase() });
  return routingState;
}

async function listStates(tenantId) {
  return RoutingState.find({ tenantId }).sort({ state: 1 });
}

module.exports = {
  getOrCreateState,
  getNextRoundRobinIndex,
  getNextRoundRobinBuyer,
  peekNextIndex,
  advanceIndex,
  resetState,
  resetAllForTenant,
  getStateInfo,
  listStates,
};
