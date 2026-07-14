const leadRepo = require('../../repositories/leadRepository')
const Setting = require('../../models/Setting')
const { shouldBlockDuplicate } = require('../../utils/deduplication')

async function dedup(ctx) {
  const { lead, tenantId } = ctx

  if (lead.isDuplicate) {
    ctx.stop = true
    ctx.stopReason = 'Lead is a duplicate'
    return
  }

  if (!lead.emailNormalized && !lead.phoneNormalized) return

  const settings = await Setting.findOne({ tenantId }).lean().catch(() => null)
  const dedupWindow = settings?.dedupWindowHours || 720

  const existingLead = await leadRepo.findDuplicate(
    lead.emailNormalized,
    lead.phoneNormalized,
    tenantId,
    dedupWindow,
    lead._id
  )

  if (shouldBlockDuplicate(lead, existingLead)) {
    lead.isDuplicate = true
    lead.duplicateOf = existingLead._id
    lead.status = 'duplicate'
    await leadRepo.findByIdAndUpdate(lead._id, tenantId, {
      isDuplicate: true,
      duplicateOf: existingLead._id,
      status: 'duplicate',
    })
    ctx.stop = true
    ctx.stopReason = `Duplicate of lead ${existingLead._id}`
  }
}

module.exports = dedup
