class RandomStrategy {
  name = 'random'

  async select(ctx) {
    const { buyerPool } = ctx
    if (!buyerPool.length) return

    const index = Math.floor(Math.random() * buyerPool.length)
    ctx.selectedBuyer = buyerPool[index]
  }
}

module.exports = new RandomStrategy()
