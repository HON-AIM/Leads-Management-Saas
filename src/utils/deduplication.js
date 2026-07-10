const PLACEHOLDER_EMAILS = new Set([
  'test@test.com', 'noreply@', 'no-reply@', 'donotreply@',
  'unknown@', 'null@', 'void@', 'none@', 'spam@',
]);

function normalizeEmailForDedup(email) {
  if (!email || typeof email !== 'string') return null;
  const cleaned = email.toLowerCase().trim();
  for (const p of PLACEHOLDER_EMAILS) {
    if (cleaned.startsWith(p) || cleaned === p) return null;
  }
  return cleaned || null;
}

function normalizePhoneForDedup(phone) {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return null;
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function shouldBlockDuplicate(lead, existingLead) {
  if (!existingLead) return false;
  if (existingLead._id.toString() === lead._id?.toString()) return false;
  return true;
}

module.exports = { normalizeEmailForDedup, normalizePhoneForDedup, shouldBlockDuplicate };
