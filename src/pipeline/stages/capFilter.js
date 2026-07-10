function capFilter(ctx) {
  const { lead } = ctx

  ctx.buyerPool = ctx.buyerPool.filter(({ buyer }) => {
    if (buyer.leadCap > 0 && buyer.leadsReceived >= buyer.leadCap) return false
    if (buyer.dailyCap > 0 && buyer.dailyLeadsReceived >= buyer.dailyCap) return false
    if (buyer.monthlyCap > 0 && buyer.monthlyLeadsReceived >= buyer.monthlyCap) return false
    return true
  })

  if (!ctx.buyerPool.length) {
    ctx.stop = true
    ctx.stopReason = 'All buyers at capacity'
  }
}

module.exports = capFilter
