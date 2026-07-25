function createContext({ lead, campaign, supplier, tenantId, excludeBuyerIds }) {
  return {
    lead,
    campaign: campaign || null,
    supplier: supplier || null,
    tenantId,
    excludeBuyerIds: excludeBuyerIds || [],
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
