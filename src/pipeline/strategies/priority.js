class PriorityStrategy {
  name = 'priority'

  async select(ctx) {
    const { buyerPool } = ctx
    if (!buyerPool.length) return

    const sorted = [...buyerPool].sort(
      (a, b) => (b.config.priority || 0) - (a.config.priority || 0)
    )

    ctx.selectedBuyer = sorted[0]
  }
}

module.exports = new PriorityStrategy()
