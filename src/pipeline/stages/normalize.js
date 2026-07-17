const { normalizeEmailForDedup, normalizePhoneForDedup } = require('../../utils/deduplication')
const { normalizeState } = require('../../utils/stateNormalizer')
const { normalizePhone } = require('../../utils/phone')

function normalize(ctx) {
  const { lead } = ctx

  if (lead.email && !lead.emailNormalized) {
    lead.emailNormalized = normalizeEmailForDedup(lead.email)
  }
  if (lead.phone && !lead.phoneNormalized) {
    lead.phoneNormalized = normalizePhoneForDedup(lead.phone)
  }
  if (lead.phone) {
    const normalized = normalizePhone(lead.phone)
    if (normalized) lead.phone = normalized
  }
  if (lead.state) {
    if (!lead.stateRaw) lead.stateRaw = lead.state;
    const normalized = normalizeState(lead.state)
    if (normalized) lead.state = normalized
    else lead.state = lead.state.toUpperCase()
  }
}

module.exports = normalize
