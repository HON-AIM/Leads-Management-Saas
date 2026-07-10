function createContext({ lead, campaign, tenantId }) {
  return {
    lead,
    campaign: campaign || null,
    tenantId,
    startTime: Date.now(),
    buyerPool: [],
    selectedBuyer: null,
    assignment: null,
    deliveryResult: null,
    routingLog: null,
    stop: false,
    stopReason: null,
    error: null,
  }
}

module.exports = { createContext }
