const PingSession = require('../models/PingSession');
const Lead = require('../models/Lead');
const Client = require('../models/Client');

const LOG_PREFIX = '[PingPostService]';

function log(step, details = {}) {
  console.log(`${LOG_PREFIX} ${new Date().toISOString()} | ${step}`, details);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildAnonymizedPing(lead, campaign) {
  return {
    pingId: null,
    state: (lead.normalized_region_code || lead.state || '').toUpperCase(),
    country: (lead.normalized_country_code || 'US').toUpperCase(),
    source: lead.source || 'api',
    campaign: campaign?.name || lead.campaign || null,
    hasPhone: Boolean(lead.phone),
    hasEmail: Boolean(lead.email && !lead.email.includes('unknown')),
    zip: lead.postal_code || null,
  };
}

async function notifyBuyerPing(buyer, pingSession) {
  const pingUrl = buyer.delivery?.config?.pingUrl || buyer.delivery?.config?.webhookUrl;
  if (!pingUrl) return;

  const payload = {
    event: 'lead_ping',
    pingId: pingSession._id.toString(),
    leadId: pingSession.leadId.toString(),
    ...pingSession.pingPayload,
    expiresAt: pingSession.expiresAt,
    bidUrl: `/api/ping/${pingSession._id}/bid`,
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    await fetch(pingUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(buyer.delivery?.config?.apiKey ? { 'X-API-Key': buyer.delivery.config.apiKey } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    log('PING_WEBHOOK_SENT', { buyerId: buyer._id, pingId: pingSession._id });
  } catch (err) {
    log('PING_WEBHOOK_FAIL', { buyerId: buyer._id, error: err.message });
  }
}

async function submitBid(pingId, buyerId, amount, tenantId, { source = 'api' } = {}) {
  const session = await PingSession.findOne({ _id: pingId, tenantId });
  if (!session) return { success: false, error: 'ping_not_found' };
  if (!['pending', 'bidding'].includes(session.status)) {
    return { success: false, error: 'ping_closed', status: session.status };
  }
  if (session.expiresAt && new Date() > session.expiresAt) {
    return { success: false, error: 'ping_expired' };
  }

  const invited = session.invitedBuyerIds.map(String);
  if (!invited.includes(String(buyerId))) {
    return { success: false, error: 'buyer_not_invited' };
  }

  const buyer = await Client.findById(buyerId).lean();
  const minBid = buyer?.minBid || 0;
  if (amount < minBid) {
    return { success: false, error: 'bid_below_minimum', minBid };
  }

  session.bids = session.bids.filter((b) => String(b.buyerId) !== String(buyerId));
  session.bids.push({
    buyerId,
    buyerName: buyer?.name || 'Unknown',
    amount,
    status: 'accepted',
    source,
    respondedAt: new Date(),
  });
  session.status = 'bidding';
  await session.save();

  log('BID_RECEIVED', { pingId, buyerId, amount });
  return { success: true, pingId, amount, bidCount: session.bids.length };
}

function resolveWinningBid(session, eligibleBuyers) {
  if (!session.bids.length) return null;

  const buyerMap = Object.fromEntries(eligibleBuyers.map((b) => [String(b._id), b]));
  const validBids = session.bids
    .filter((b) => buyerMap[String(b.buyerId)])
    .sort((a, b) => b.amount - a.amount || new Date(a.respondedAt) - new Date(b.respondedAt));

  if (!validBids.length) return null;

  const winner = validBids[0];
  return {
    buyer: buyerMap[String(winner.buyerId)],
    winningBid: winner.amount,
    bid: winner,
  };
}

async function createPingSession(lead, tenantId, campaign, eligibleBuyers, timeoutMs) {
  const expiresAt = new Date(Date.now() + timeoutMs);
  const pingPayload = buildAnonymizedPing(lead, campaign);

  const session = await PingSession.create({
    tenantId,
    leadId: lead._id,
    campaignId: campaign?._id,
    campaignName: campaign?.name,
    status: 'pending',
    pingPayload,
    invitedBuyerIds: eligibleBuyers.map((b) => b._id),
    expiresAt,
  });

  pingPayload.pingId = session._id.toString();

  lead.ingestionStatus = 'ping_pending';
  lead.pingSessionId = session._id;
  await lead.save();

  for (const buyer of eligibleBuyers) {
    const autoBid = buyer.pricePerLead || 0;
    if (autoBid > 0 && autoBid >= (buyer.minBid || 0)) {
      session.bids.push({
        buyerId: buyer._id,
        buyerName: buyer.name,
        amount: autoBid,
        status: 'auto',
        source: 'auto',
        respondedAt: new Date(),
      });
    }
    notifyBuyerPing(buyer, session).catch(() => {});
  }

  session.status = 'bidding';
  await session.save();

  log('PING_CREATED', { pingId: session._id, buyers: eligibleBuyers.length, autoBids: session.bids.length });
  return session;
}

async function runPingPostAuction(lead, tenantId, campaign, eligibleBuyers) {
  const timeoutMs = campaign?.pingTimeoutMs || 3000;

  if (!eligibleBuyers.length) {
    return { success: false, reason: 'no_eligible_buyers' };
  }

  const session = await createPingSession(lead, tenantId, campaign, eligibleBuyers, timeoutMs);

  const remaining = session.expiresAt.getTime() - Date.now();
  if (remaining > 0) await sleep(Math.min(remaining, timeoutMs));

  const freshSession = await PingSession.findById(session._id);
  const result = resolveWinningBid(freshSession, eligibleBuyers);

  if (!result) {
    freshSession.status = 'no_bids';
    freshSession.resolvedAt = new Date();
    await freshSession.save();
    log('PING_NO_BIDS', { pingId: session._id });
    return { success: false, reason: 'no_bids', pingSessionId: session._id };
  }

  freshSession.status = 'won';
  freshSession.winnerBuyerId = result.buyer._id;
  freshSession.winningBid = result.winningBid;
  freshSession.resolvedAt = new Date();
  await freshSession.save();

  log('PING_WON', { pingId: session._id, buyer: result.buyer.name, bid: result.winningBid });

  return {
    success: true,
    buyer: result.buyer,
    winningBid: result.winningBid,
    pingSessionId: session._id,
  };
}

async function getPingSession(pingId, tenantId) {
  return PingSession.findOne({ _id: pingId, tenantId })
    .populate('winnerBuyerId', 'name email')
    .populate('leadId', 'name state source status')
    .lean();
}

async function executePost(pingId, tenantId) {
  const session = await PingSession.findOne({ _id: pingId, tenantId });
  if (!session) return { success: false, error: 'ping_not_found' };
  if (session.status !== 'won') return { success: false, error: 'ping_not_ready', status: session.status };

  const lead = await Lead.findById(session.leadId);
  const buyer = await Client.findById(session.winnerBuyerId).lean();
  if (!lead || !buyer) return { success: false, error: 'lead_or_buyer_missing' };

  session.status = 'posted';
  session.postedAt = new Date();
  await session.save();

  return {
    success: true,
    lead,
    buyer,
    winningBid: session.winningBid,
    pingSessionId: session._id,
  };
}

module.exports = {
  buildAnonymizedPing,
  createPingSession,
  runPingPostAuction,
  submitBid,
  resolveWinningBid,
  getPingSession,
  executePost,
};
