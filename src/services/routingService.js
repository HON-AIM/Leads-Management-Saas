const { runPipeline } = require('../pipeline')

class RoutingService {
  async routeLead(lead, campaign, tenantId) {
    const ctx = await runPipeline({ lead, campaign, tenantId })

    if (ctx.stop && !ctx.assignment) {
      return null
    }

    return {
      assignment: ctx.assignment,
      buyer: ctx.selectedBuyer?.buyer,
      deliveryResult: ctx.deliveryResult,
    }
  }
}

module.exports = new RoutingService()
