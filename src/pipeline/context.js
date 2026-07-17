function createContext({ lead, campaign, supplier, tenantId }) {
  return {
    lead,
    campaign: campaign || null,
    supplier: supplier || null,
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
