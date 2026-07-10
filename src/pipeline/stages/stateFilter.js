function stateFilter(ctx) {
  const { lead } = ctx
  const leadState = lead.state?.toUpperCase()

  if (!leadState) return

  ctx.buyerPool = ctx.buyerPool.filter(({ buyer }) => {
    if (!buyer.allowedStates?.length) return true
    return buyer.allowedStates.includes(leadState)
  })

  if (!ctx.buyerPool.length) {
    ctx.stop = true
    ctx.stopReason = `No buyers accept leads from ${leadState}`
  }
}

module.exports = stateFilter
