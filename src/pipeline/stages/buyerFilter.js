const Buyer = require('../../models/Buyer')

async function buyerFilter(ctx) {
  const { campaign, lead, tenantId } = ctx

  const entries = campaign.assignedBuyers || []
  if (!entries.length) {
    ctx.stop = true
    ctx.stopReason = 'No buyers assigned to campaign'
    return
  }

  const buyerIds = entries.map((e) => e.buyerId)
  const buyers = await Buyer.find({ _id: { $in: buyerIds }, tenantId }).lean()

  const buyerMap = new Map(buyers.map((b) => [b._id.toString(), b]))
  const configMap = new Map(entries.map((e) => [e.buyerId.toString(), e]))

  ctx.buyerPool = []
  const rejected = []

  for (const entry of entries) {
    const buyer = buyerMap.get(entry.buyerId.toString())
    if (!buyer) {
      rejected.push({ id: entry.buyerId, reason: 'buyer not found or deleted' })
      continue
    }

    if (buyer.status !== 'active') {
      rejected.push({ buyer: buyer.name, reason: `status is ${buyer.status}` })
      continue
    }

    if (buyer.schedule?.enabled) {
      if (!isWithinSchedule(buyer)) {
        rejected.push({ buyer: buyer.name, reason: `outside schedule (${buyer.schedule.days?.join(',') || 'all days'} ${buyer.schedule.startTime || '09:00'}-${buyer.schedule.endTime || '17:00'})` })
        continue
      }
    }

    ctx.buyerPool.push({ buyer, config: entry })
  }

  if (!ctx.buyerPool.length) {
    ctx.stop = true
    ctx.stopReason = rejected.length
      ? `No eligible buyers after filtering: ${rejected.map((r) => `${r.buyer || r.id} - ${r.reason}`).join('; ')}`
      : 'No eligible buyers after filtering'
  }
}

function isWithinSchedule(buyer) {
  const now = new Date()
  const tz = buyer.schedule.timezone || 'America/New_York'
  const localTime = new Date(now.toLocaleString('en-US', { timeZone: tz }))
  const day = localTime.getDay()
  const hours = localTime.getHours()
  const minutes = localTime.getMinutes()
  const currentMinutes = hours * 60 + minutes

  if (buyer.schedule.days?.length && !buyer.schedule.days.includes(day)) return false

  const [startH, startM] = (buyer.schedule.startTime || '09:00').split(':').map(Number)
  const [endH, endM] = (buyer.schedule.endTime || '17:00').split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes
}

module.exports = buyerFilter
