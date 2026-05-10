const BuyerCap = require('../models/BuyerCap');
const Client = require('../models/Client');

const LOG_PREFIX = '[CapService]';

function today() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return { date: `${yyyy}-${mm}-${dd}`, yearMonth: `${yyyy}-${mm}` };
}

function isBelowCap(current, cap) {
  if (cap === 0) return true;
  return current < cap;
}

function canBuyerAccept(buyer) {
  if (!isBelowCap(buyer.dailyLeadsReceived, buyer.dailyCap)) {
    return { eligible: false, reason: 'daily_cap_reached', cap: { type: 'daily', current: buyer.dailyLeadsReceived, limit: buyer.dailyCap } };
  }
  if (!isBelowCap(buyer.monthlyLeadsReceived, buyer.monthlyCap)) {
    return { eligible: false, reason: 'monthly_cap_reached', cap: { type: 'monthly', current: buyer.monthlyLeadsReceived, limit: buyer.monthlyCap } };
  }
  if (!isBelowCap(buyer.leadsReceived, buyer.leadCap)) {
    return { eligible: false, reason: 'lifetime_cap_reached', cap: { type: 'lifetime', current: buyer.leadsReceived, limit: buyer.leadCap } };
  }
  return { eligible: true };
}

async function filterByCaps(buyers) {
  const results = [];
  for (const buyer of buyers) {
    const check = canBuyerAccept(buyer);
    if (check.eligible) {
      results.push(buyer);
    }
  }
  return results;
}

async function incrementBuyerUsage(buyerId, tenantId) {
  const { date, yearMonth } = today();

  await BuyerCap.bulkWrite([
    {
      updateOne: {
        filter: { buyerId, date },
        update: { $inc: { leadsReceived: 1 }, $setOnInsert: { buyerId, tenantId, date, yearMonth } },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { buyerId, yearMonth },
        update: { $inc: { leadsReceived: 1 }, $setOnInsert: { buyerId, tenantId, date: date, yearMonth } },
        upsert: true,
      },
    },
  ]);

  const buyer = await Client.findByIdAndUpdate(
    buyerId,
    {
      $inc: {
        leadsReceived: 1,
        dailyLeadsReceived: 1,
        monthlyLeadsReceived: 1,
      },
      $set: { lastAssignedAt: new Date() },
    },
    { new: true }
  );

  if (buyer && buyer.leadCap > 0 && buyer.leadsReceived >= buyer.leadCap) {
    await Client.findByIdAndUpdate(buyerId, { status: 'full' });
  }

  return buyer;
}

async function assignLeadIncrement(buyerId, leadCap) {
  if (leadCap === 0) {
    return Client.findByIdAndUpdate(
      buyerId,
      {
        $inc: {
          leadsReceived: 1,
          dailyLeadsReceived: 1,
          monthlyLeadsReceived: 1,
        },
        $set: { lastAssignedAt: new Date() },
      },
      { new: true }
    );
  }

  return Client.findOneAndUpdate(
    { _id: buyerId, leadsReceived: { $lt: leadCap } },
    {
      $inc: {
        leadsReceived: 1,
        dailyLeadsReceived: 1,
        monthlyLeadsReceived: 1,
      },
      $set: { lastAssignedAt: new Date() },
    },
    { new: true }
  );
}

async function resetDailyCounters() {
  const result = await Client.updateMany(
    { dailyLeadsReceived: { $gt: 0 } },
    { $set: { dailyLeadsReceived: 0 } }
  );
  return { modifiedCount: result.modifiedCount };
}

async function resetMonthlyCounters() {
  const result = await Client.updateMany(
    { monthlyLeadsReceived: { $gt: 0 } },
    { $set: { monthlyLeadsReceived: 0 } }
  );
  return { modifiedCount: result.modifiedCount };
}

async function resetAllCounters(buyerId) {
  await Client.findByIdAndUpdate(buyerId, {
    $set: {
      leadsReceived: 0,
      dailyLeadsReceived: 0,
      monthlyLeadsReceived: 0,
      status: 'active',
    },
  });
}

async function getCapStatus(buyerId) {
  const buyer = await Client.findById(buyerId).select(
    'leadCap leadsReceived dailyCap dailyLeadsReceived monthlyCap monthlyLeadsReceived status'
  );
  if (!buyer) return null;

  const { date, yearMonth } = today();
  const [dailyCapDoc, monthlyCapDoc] = await Promise.all([
    BuyerCap.findOne({ buyerId, date }),
    BuyerCap.findOne({ buyerId, yearMonth }),
  ]);

  const dailyUsed = dailyCapDoc?.leadsReceived || buyer.dailyLeadsReceived;
  const monthlyUsed = monthlyCapDoc?.leadsReceived || buyer.monthlyLeadsReceived;

  return {
    buyerId: buyer._id,
    lifetime: {
      cap: buyer.leadCap,
      used: buyer.leadsReceived,
      remaining: buyer.leadCap === 0 ? Infinity : Math.max(0, buyer.leadCap - buyer.leadsReceived),
      isUnlimited: buyer.leadCap === 0,
    },
    daily: {
      cap: buyer.dailyCap,
      used: dailyUsed,
      remaining: buyer.dailyCap === 0 ? Infinity : Math.max(0, buyer.dailyCap - dailyUsed),
      isUnlimited: buyer.dailyCap === 0,
    },
    monthly: {
      cap: buyer.monthlyCap,
      used: monthlyUsed,
      remaining: buyer.monthlyCap === 0 ? Infinity : Math.max(0, buyer.monthlyCap - monthlyUsed),
      isUnlimited: buyer.monthlyCap === 0,
    },
    status: buyer.status,
  };
}

module.exports = {
  canBuyerAccept,
  filterByCaps,
  incrementBuyerUsage,
  assignLeadIncrement,
  resetDailyCounters,
  resetMonthlyCounters,
  resetAllCounters,
  getCapStatus,
};
