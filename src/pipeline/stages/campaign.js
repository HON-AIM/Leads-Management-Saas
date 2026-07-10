const Campaign = require('../../models/Campaign')

async function campaignLookup(ctx) {
  if (ctx.campaign) return

  const { lead, tenantId } = ctx

  if (lead.campaignId) {
    ctx.campaign = await Campaign.findOne({
      _id: lead.campaignId,
      tenantId,
      status: 'active',
    })
  }

  if (!ctx.campaign) {
    ctx.campaign = await Campaign.findOne({
      tenantId,
      status: 'active',
    })
  }

  if (!ctx.campaign) {
    ctx.stop = true
    ctx.stopReason = 'No active campaign found'
  }
}

module.exports = campaignLookup
