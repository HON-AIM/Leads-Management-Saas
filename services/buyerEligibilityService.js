const Client = require('../models/Client');
const { filterByCaps } = require('./capService');
const { evaluateBuyerRules } = require('./buyerRuleEngine');
const { evaluateCustomFilter } = require('./buyerRuleEngine');

const LOG_PREFIX = '[BuyerEligibility]';

function log(step, details = {}) {
  console.log(`${LOG_PREFIX} ${new Date().toISOString()} | ${step}`, details);
}

function filterBySchedule(buyers, now = new Date()) {
  const results = [];

  for (const buyer of buyers) {
    if (!buyer.schedule || !buyer.schedule.enabled) {
      results.push(buyer);
      continue;
    }

    const schedule = buyer.schedule;
    let buyerTime;
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: schedule.timezone || 'America/New_York',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'short',
      });
      const parts = formatter.formatToParts(now);
      const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
      const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
      const weekday = parts.find((p) => p.type === 'weekday')?.value || '';
      const dayMap = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };
      buyerTime = {
        dayOfWeek: dayMap[weekday.toLowerCase().slice(0, 3)] ?? now.getDay(),
        timeStr: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      };
    } catch {
      const d = new Date(now.toLocaleString('en-US', { timeZone: schedule.timezone || 'America/New_York' }));
      buyerTime = {
        dayOfWeek: d.getDay(),
        timeStr: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      };
    }

    if (schedule.days?.length && !schedule.days.includes(buyerTime.dayOfWeek)) continue;
    if (schedule.startTime && buyerTime.timeStr < schedule.startTime) continue;
    if (schedule.endTime && buyerTime.timeStr > schedule.endTime) continue;

    results.push(buyer);
  }

  return results;
}

function passesCampaignInboundFilters(campaign, lead) {
  const filters = campaign?.inboundFilters || [];
  for (const filter of filters) {
    if (!evaluateCustomFilter(lead, filter)) {
      return { pass: false, reason: `campaign_filter_failed_${filter.field}` };
    }
  }
  return { pass: true };
}

/**
 * Lead Distro evaluation order:
 * 1. Campaign inbound filters
 * 2. Geo + quality rules per buyer (buyerRuleEngine)
 * 3. Caps
 * 4. Schedule
 */
async function filterEligibleFromList(buyers, lead, campaign = null) {
  if (!buyers.length) {
    return { eligible: [], reason: 'no_buyers_in_campaign', audit: [] };
  }

  if (campaign) {
    const inbound = passesCampaignInboundFilters(campaign, lead);
    if (!inbound.pass) {
      return { eligible: [], reason: inbound.reason, audit: [] };
    }
  }

  const audit = [];
  const afterRules = [];

  for (const buyer of buyers) {
    const result = evaluateBuyerRules(buyer, lead);
    audit.push({
      buyerId: buyer._id,
      buyerName: buyer.name,
      eligible: result.eligible,
      stage: result.stage,
      reason: result.reason,
    });
    if (result.eligible) afterRules.push(buyer);
  }

  if (afterRules.length === 0) {
    return { eligible: [], reason: 'no_buyers_match_rules', audit };
  }

  const capBuyers = await filterByCaps(afterRules);
  if (capBuyers.length === 0) {
    return { eligible: [], reason: 'all_buyers_at_capacity', audit };
  }

  const scheduledBuyers = filterBySchedule(capBuyers);
  if (scheduledBuyers.length === 0) {
    return { eligible: [], reason: 'no_buyers_available_on_schedule', audit };
  }

  return { eligible: scheduledBuyers, reason: null, audit };
}

async function loadActiveBuyers(tenantId) {
  return Client.find({
    tenantId,
    status: { $ne: 'inactive' },
    isPaused: false,
  }).sort({ priority: 1, name: 1 }).lean();
}

async function getEligibleBuyers(tenantId, lead, campaign = null) {
  const activeBuyers = await loadActiveBuyers(tenantId);
  if (activeBuyers.length === 0) {
    return { eligible: [], reason: 'no_active_buyers', audit: [] };
  }
  return filterEligibleFromList(activeBuyers, lead, campaign);
}

async function findFallbackBuyer(tenantId, campaign) {
  if (campaign?.fallbackBuyerId) {
    const fb = await Client.findOne({
      _id: campaign.fallbackBuyerId,
      tenantId,
      status: { $ne: 'inactive' },
      isPaused: false,
    }).lean();
    if (fb) return fb;
  }

  return Client.findOne({
    tenantId,
    status: { $ne: 'inactive' },
    isPaused: false,
    isFallbackBuyer: true,
  }).lean();
}

module.exports = {
  loadActiveBuyers,
  filterBySchedule,
  filterEligibleFromList,
  getEligibleBuyers,
  findFallbackBuyer,
  passesCampaignInboundFilters,
};
