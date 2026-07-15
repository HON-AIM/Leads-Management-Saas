const { getStrategy } = require('../strategies')
const leadAssignmentRepo = require('../../repositories/leadAssignmentRepository')
const buyerService = require('../../services/buyerService')

async function assign(ctx) {
  const { lead, campaign, tenantId } = ctx

  const strategy = getStrategy(campaign.routingMode)
  await strategy.select(ctx)

  if (!ctx.selectedBuyer) {
    ctx.stop = true
    ctx.stopReason = 'No buyer selected by routing strategy'
    return
  }

  await buyerService.incrementCaps(ctx.selectedBuyer.buyer._id, tenantId)

  ctx.assignment = await leadAssignmentRepo.create({
    leadId: lead._id,
    buyerId: ctx.selectedBuyer.buyer._id,
    tenantId,
    campaignId: campaign._id,
    routingMode: campaign.routingMode,
    cost: campaign.costPerLead || 0,
    revenue: ctx.selectedBuyer.buyer.pricePerLead || 0,
    status: 'pending',
  })

  lead.status = 'assigned'
  await lead.save()
}

module.exports = assign
