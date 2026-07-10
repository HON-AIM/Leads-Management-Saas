const campaignRepo = require('../../repositories/campaignRepository')

class RoundRobinStrategy {
  name = 'round_robin'

  async select(ctx) {
    const { campaign, buyerPool, tenantId } = ctx
    if (!buyerPool.length) return

    const buyerCount = buyerPool.length
    const newIndex = await campaignRepo.incrementRoundRobinIndex(campaign._id, tenantId, buyerCount)
    const selectedIndex = ((newIndex - 1) % buyerCount + buyerCount) % buyerCount

    ctx.selectedBuyer = buyerPool[selectedIndex]
  }
}

module.exports = new RoundRobinStrategy()
