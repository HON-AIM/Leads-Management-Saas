const leadRepo = require('../../repositories/leadRepository')
const Setting = require('../../models/Setting')
const Campaign = require('../../models/Campaign')
const Lead = require('../../models/Lead')
const LeadAssignment = require('../../models/LeadAssignment')
const { shouldBlockDuplicate } = require('../../utils/deduplication')
const { attemptDelivery } = require('../../services/deliveryAttemptService')
const config = require('../../config')
const logger = require('../../utils/logger')

async function dedup(ctx) {
  const { lead, tenantId } = ctx

  if (lead.isDuplicate) {
    let campaign = ctx.campaign
    if (!campaign && lead.campaignId) {
      campaign = await Campaign.findById(lead.campaignId).lean().catch(() => null)
      if (campaign) ctx.campaign = campaign
    }
    const handling = campaign?.duplicateHandling || 'reject'

    if (handling === 'assign_anyway') {
      return
    }

    if (handling === 'update_existing' && lead.duplicateOf) {
      await handleUpdateExisting(lead, ctx)
      ctx.stop = true
      ctx.stopReason = `Duplicate merged into lead ${lead.duplicateOf}`
      return
    }

    ctx.stop = true
    ctx.stopReason = 'Lead is a duplicate'
    return
  }

  if (!lead.emailNormalized && !lead.phoneNormalized) return

  let campaign = ctx.campaign
  if (!campaign && lead.campaignId) {
    campaign = await Campaign.findById(lead.campaignId).lean().catch(() => null)
    if (campaign) ctx.campaign = campaign
  }
  const handling = campaign?.duplicateHandling || 'reject'

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

    if (handling === 'assign_anyway') {
      await leadRepo.findByIdAndUpdate(lead._id, tenantId, {
        isDuplicate: true,
        duplicateOf: existingLead._id,
      })
      return
    }

    if (handling === 'update_existing') {
      await leadRepo.findByIdAndUpdate(lead._id, tenantId, {
        isDuplicate: true,
        duplicateOf: existingLead._id,
        status: 'merged',
      })
      await handleUpdateExisting(lead, ctx)
      ctx.stop = true
      ctx.stopReason = `Duplicate merged into lead ${existingLead._id}`
      return
    }

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

async function handleUpdateExisting(lead, ctx) {
  const { tenantId } = ctx
  const originalLead = await Lead.findById(lead.duplicateOf).lean()
  if (!originalLead) return

  const updates = {}
  const source = lead.rawPayload || {}
  const mergeFields = ['name', 'email', 'phone', 'phoneNormalized', 'emailNormalized', 'state', 'stateRaw']
  for (const field of mergeFields) {
    const newVal = field === 'rawPayload' ? source : (lead[field] || source[field])
    if (newVal && newVal !== originalLead[field]) {
      updates[field] = newVal
    }
  }
  if (Object.keys(updates).length > 0) {
    await Lead.findByIdAndUpdate(lead.duplicateOf, { $set: updates })
  }

  const assignment = await LeadAssignment.findOne({
    leadId: lead.duplicateOf,
    tenantId,
  }).sort({ createdAt: -1 }).lean()

  if (!assignment) return

  const buyer = await require('../../models/Buyer').findById(assignment.buyerId).lean()
  if (!buyer) return

  const campaign = ctx.campaign || (await Campaign.findById(originalLead.campaignId).lean())
  if (!campaign) return

  let supplier = null
  if (originalLead.supplierId) {
    supplier = await require('../../models/Supplier').findById(originalLead.supplierId).lean()
  }

  const updatedOriginal = await Lead.findById(lead.duplicateOf).lean()

  const newAssignment = await LeadAssignment.create({
    leadId: lead._id,
    buyerId: buyer._id,
    tenantId,
    campaignId: campaign._id,
    routingMode: 'update_existing',
    cost: campaign.costPerLead || 0,
    revenue: buyer.pricePerLead || 0,
    status: 'pending',
  })

  try {
    const result = await attemptDelivery({
      leadAssignment: newAssignment,
      lead: updatedOriginal,
      buyer,
      campaign,
      supplier,
      triggeredBy: 'automatic',
      tenantId,
    })

    if (result.success) {
      await Lead.findByIdAndUpdate(lead._id, { status: 'merged' })
    } else {
      logger.warn('Update-existing delivery failed', { leadId: lead._id, originalLeadId: lead.duplicateOf })
    }
  } catch (err) {
    logger.error('Update-existing delivery error', { leadId: lead._id, error: err.message })
  }
}

module.exports = dedup
