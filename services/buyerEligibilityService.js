const Client = require('../models/Client');
const { filterByCaps } = require('./capService');

const LOG_PREFIX = '[BuyerEligibility]';

function log(step, details = {}) {
  const ts = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${ts} | Step: ${step}`, details);
}

async function loadActiveBuyers(tenantId) {
  const buyers = await Client.find({
    tenantId,
    status: { $ne: 'inactive' },
    isPaused: false,
  }).sort({ priority: 1, name: 1 }).lean();

  return buyers;
}

function filterByStateEligibility(buyers, leadState) {
  if (!leadState) return buyers;
  const stateUpper = leadState.toUpperCase();
  return buyers.filter(b => {
    const buyerRegions = b.allowed_regions && b.allowed_regions.length > 0
      ? b.allowed_regions
      : (b.allowedStates && b.allowedStates.length > 0 ? b.allowedStates : []);
    if (buyerRegions.length > 0) {
      return buyerRegions.map(r => r.toUpperCase()).includes(stateUpper);
    }
    return (b.state || '').toUpperCase() === stateUpper;
  });
}

function getBuyerTime(now, timezone) {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
    });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    const weekday = parts.find(p => p.type === 'weekday')?.value || '';

    const dayMap = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };
    const dayOfWeek = dayMap[weekday.toLowerCase().slice(0, 3)] ?? now.getDay();
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    return { dayOfWeek, timeStr };
  } catch {
    const d = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    return {
      dayOfWeek: d.getDay(),
      timeStr: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    };
  }
}

function filterBySchedule(buyers, now = new Date()) {
  const results = [];

  for (const buyer of buyers) {
    if (!buyer.schedule || !buyer.schedule.enabled) {
      results.push(buyer);
      continue;
    }

    const schedule = buyer.schedule;
    const buyerTime = getBuyerTime(now, schedule.timezone || 'America/New_York');

    if (schedule.days && schedule.days.length > 0 && !schedule.days.includes(buyerTime.dayOfWeek)) {
      continue;
    }

    if (schedule.startTime && buyerTime.timeStr < schedule.startTime) {
      continue;
    }

    if (schedule.endTime && buyerTime.timeStr > schedule.endTime) {
      continue;
    }

    results.push(buyer);
  }

  return results;
}

async function getEligibleBuyers(tenantId, leadState) {
  log('LOAD_ACTIVE', { tenantId });
  const activeBuyers = await loadActiveBuyers(tenantId);
  log('ACTIVE_COUNT', { count: activeBuyers.length });

  if (activeBuyers.length === 0) {
    return { eligible: [], reason: 'no_active_buyers' };
  }

  log('STATE_FILTER', { leadState });
  const stateBuyers = filterByStateEligibility(activeBuyers, leadState);
  log('STATE_COUNT', { count: stateBuyers.length, state: leadState });

  if (stateBuyers.length === 0) {
    return { eligible: [], reason: `no_buyers_for_state_${leadState}` };
  }

  log('CAP_FILTER', {});
  const capBuyers = await filterByCaps(stateBuyers);
  log('CAP_COUNT', { count: capBuyers.length });

  if (capBuyers.length === 0) {
    return { eligible: [], reason: 'all_buyers_at_capacity' };
  }

  log('SCHEDULE_FILTER', {});
  const scheduledBuyers = filterBySchedule(capBuyers);
  log('SCHEDULE_COUNT', { count: scheduledBuyers.length });

  if (scheduledBuyers.length === 0) {
    return { eligible: [], reason: 'no_buyers_available_on_schedule' };
  }

  log('ELIGIBLE', { count: scheduledBuyers.length });
  return { eligible: scheduledBuyers, reason: null };
}

async function findFallbackBuyers(tenantId, excludedBuyerIds = []) {
  log('FALLBACK_SEARCH', { tenantId, excludedCount: excludedBuyerIds.length });

  const query = {
    tenantId,
    status: { $ne: 'inactive' },
    isPaused: false,
  };

  if (excludedBuyerIds.length > 0) {
    query._id = { $nin: excludedBuyerIds };
  }

  const fallbackBuyers = await Client.find({
    ...query,
    fallbackGroup: { $ne: null },
  }).sort({ priority: 1, name: 1 }).lean();

  if (fallbackBuyers.length > 0) {
    log('FALLBACK_GROUP_FOUND', { count: fallbackBuyers.length });
    return fallbackBuyers;
  }

  const anyActive = await Client.find(query)
    .sort({ priority: 1, name: 1 })
    .limit(5)
    .lean();

  log('FALLBACK_ANY_ACTIVE', { count: anyActive.length });
  return anyActive;
}

module.exports = {
  loadActiveBuyers,
  filterByStateEligibility,
  filterBySchedule,
  getEligibleBuyers,
  findFallbackBuyers,
};
