function capFilter(ctx) {
  const { lead } = ctx

  const rejected = []

  ctx.buyerPool = ctx.buyerPool.filter(({ buyer }) => {
    if (buyer.leadCap > 0 && buyer.leadsReceived >= buyer.leadCap) {
      rejected.push({ buyer: buyer.name || buyer._id, reason: `lifetime cap reached (${buyer.leadsReceived}/${buyer.leadCap})` })
      return false
    }
    if (buyer.dailyCap > 0 && buyer.dailyLeadsReceived >= buyer.dailyCap) {
      rejected.push({ buyer: buyer.name || buyer._id, reason: `daily cap reached (${buyer.dailyLeadsReceived}/${buyer.dailyCap})` })
      return false
    }
    if (buyer.monthlyCap > 0 && buyer.monthlyLeadsReceived >= buyer.monthlyCap) {
      rejected.push({ buyer: buyer.name || buyer._id, reason: `monthly cap reached (${buyer.monthlyLeadsReceived}/${buyer.monthlyCap})` })
      return false
    }
    return true
  })

  if (!ctx.buyerPool.length) {
    ctx.stop = true
    ctx.stopReason = rejected.length
      ? `All buyers at capacity: ${rejected.map((r) => `${r.buyer} - ${r.reason}`).join('; ')}`
      : 'All buyers at capacity'
  }
}

module.exports = capFilter
