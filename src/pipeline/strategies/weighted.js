class WeightedStrategy {
  name = 'weighted'

  async select(ctx) {
    const { buyerPool } = ctx
    if (!buyerPool.length) return

    const totalWeight = buyerPool.reduce((sum, entry) => sum + (entry.config.weight || 1), 0)
    let random = Math.random() * totalWeight

    for (const entry of buyerPool) {
      random -= entry.config.weight || 1
      if (random <= 0) {
        ctx.selectedBuyer = entry
        return
      }
    }

    ctx.selectedBuyer = buyerPool[buyerPool.length - 1]
  }
}

module.exports = new WeightedStrategy()
