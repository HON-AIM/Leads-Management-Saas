const { normalizeEmailForDedup, normalizePhoneForDedup } = require('../../utils/deduplication')
const { normalizeState } = require('../../utils/stateNormalizer')
const { normalizePhone } = require('../../utils/phone')

async function normalize(ctx) {
  const { lead } = ctx
  let changed = false

  if (lead.email && !lead.emailNormalized) {
    lead.emailNormalized = normalizeEmailForDedup(lead.email)
    changed = true
  }
  if (lead.phone && !lead.phoneNormalized) {
    lead.phoneNormalized = normalizePhoneForDedup(lead.phone)
    changed = true
  }
  if (lead.phone) {
    const normalized = normalizePhone(lead.phone)
    if (normalized && normalized !== lead.phone) { lead.phone = normalized; changed = true }
  }
  if (lead.state) {
    if (!lead.stateRaw) { lead.stateRaw = lead.state; changed = true }
    const normalized = normalizeState(lead.state)
    if (normalized && normalized !== lead.state) { lead.state = normalized; changed = true }
    else if (!normalized && lead.state !== lead.state.toUpperCase()) { lead.state = lead.state.toUpperCase(); changed = true }
  }

  if (changed) await lead.save()
}

module.exports = normalize
