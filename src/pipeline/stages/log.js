const routingLogRepo = require('../../repositories/routingLogRepository')

async function log(ctx) {
  const { lead, campaign, tenantId, selectedBuyer, startTime } = ctx

  const logData = {
    leadId: lead._id,
    campaignId: campaign?._id,
    tenantId,
    routingMode: campaign?.routingMode,
    eligibleBuyerIds: (ctx.buyerPool || []).map((e) => e.buyer._id),
    selectedBuyerId: selectedBuyer?.buyer?._id || null,
    reason: selectedBuyer
      ? `Routed via ${campaign?.routingMode}`
      : ctx.stopReason || 'No eligible buyers',
    durationMs: Date.now() - startTime,
  }

  ctx.routingLog = await routingLogRepo.create(logData)
}

module.exports = log
