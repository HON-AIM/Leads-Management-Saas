const Lead = require('../models/Lead');
const Tenant = require('../models/Tenant');
const Campaign = require('../models/Campaign');

const LOG_PREFIX = '[DedupService]';
const DEFAULT_DEDUP_WINDOW_HOURS = 720; // 30 days — Lead Distro-style default

const PLACEHOLDER_EMAILS = new Set([
  'unknown@lead.local',
  'no-email@system.local',
  'no-email@webhook.local',
  'unknown@lead.local',
]);

function log(step, details = {}) {
  console.log(`${LOG_PREFIX} ${new Date().toISOString()} | ${step}`, details);
}

function normalizeEmailForDedup(email) {
  if (!email) return null;
  const normalized = String(email).trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) return null;
  if (PLACEHOLDER_EMAILS.has(normalized)) return null;
  if (normalized.startsWith('unknown@') || normalized.startsWith('no-email@')) return null;
  return normalized;
}

function normalizePhoneForDedup(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

function shouldBlockRouting(lead = {}) {
  if (!lead) return false;
  if (lead.isDuplicate || lead.ingestionStatus === 'duplicate' || lead.status === 'duplicate') return true;
  if (lead.assignmentStatus === 'assigned' || lead.assignedBuyerId || lead.assignedTo) return true;
  return false;
}

function applyNormalizedFields(data) {
  return {
    ...data,
    normalizedEmail: normalizeEmailForDedup(data.email),
    normalizedPhone: normalizePhoneForDedup(data.phone),
  };
}

async function resolveDedupWindowHours(tenantId, campaignId, options = {}) {
  if (options.dedupWindowHours != null) {
    return parseInt(options.dedupWindowHours, 10) || DEFAULT_DEDUP_WINDOW_HOURS;
  }

  if (campaignId) {
    const campaign = await Campaign.findById(campaignId).select('dedupEnabled dedupWindowHours').lean();
    if (campaign?.dedupEnabled === false) return 0;
    if (campaign?.dedupWindowHours) return campaign.dedupWindowHours;
  }

  if (tenantId) {
    const tenant = await Tenant.findById(tenantId).select('settings.dedupWindowHours').lean();
    if (tenant?.settings?.dedupWindowHours) return tenant.settings.dedupWindowHours;
  }

  return DEFAULT_DEDUP_WINDOW_HOURS;
}

async function resolveOriginalLeadId(leadId) {
  let current = leadId;
  for (let i = 0; i < 10; i++) {
    const doc = await Lead.findById(current).select('duplicateOf ingestionStatus isDuplicate').lean();
    if (!doc) return leadId;
    if (!doc.isDuplicate && doc.ingestionStatus !== 'duplicate') return current;
    if (!doc.duplicateOf) return current;
    current = doc.duplicateOf;
  }
  return current;
}

async function findDuplicate({ email, phone, tenantId, windowHours, excludeLeadId = null }) {
  const normEmail = normalizeEmailForDedup(email);
  const normPhone = normalizePhoneForDedup(phone);

  if (!normEmail && !normPhone) return null;
  if (!windowHours || windowHours <= 0) return null;

  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  const orConditions = [];

  if (normEmail) {
    orConditions.push({ normalizedEmail: normEmail });
    orConditions.push({ email: normEmail });
  }
  if (normPhone) {
    orConditions.push({ normalizedPhone: normPhone });
    orConditions.push({ phone: normPhone });
    orConditions.push({ phone: new RegExp(`${normPhone}$`) });
  }

  const filter = {
    tenantId,
    createdAt: { $gte: since },
    ingestionStatus: { $nin: ['duplicate', 'failed'] },
    isDuplicate: { $ne: true },
    $or: orConditions,
  };

  if (excludeLeadId) {
    filter._id = { $ne: excludeLeadId };
  }

  const existing = await Lead.findOne(filter)
    .sort({ createdAt: 1 })
    .select('_id email phone createdAt assignedTo status normalizedEmail normalizedPhone')
    .lean();

  if (!existing) return null;

  const originalId = await resolveOriginalLeadId(existing._id);
  let reason = 'phone';
  if (normEmail) {
    const existingEmail = normalizeEmailForDedup(existing.normalizedEmail || existing.email);
    if (existingEmail === normEmail) reason = 'email';
  }

  log('DUPLICATE_MATCH', {
    originalId,
    reason,
    matchedLeadId: existing._id,
    windowHours,
  });

  return {
    duplicateOf: originalId,
    reason,
    matchedLead: existing,
  };
}

function buildDuplicateLeadData(leadFields, duplicateResult) {
  const normalized = applyNormalizedFields(leadFields);
  return {
    ...normalized,
    ingestionStatus: 'duplicate',
    status: 'duplicate',
    deliveryStatus: 'skipped',
    assignedTo: null,
    assignedBuyerId: null,
    assignmentStatus: 'unassigned',
    isDuplicate: true,
    duplicateOf: duplicateResult.duplicateOf,
    duplicateReason: duplicateResult.reason,
  };
}

async function markLeadAsDuplicate(lead, duplicateResult) {
  lead.ingestionStatus = 'duplicate';
  lead.status = 'duplicate';
  lead.deliveryStatus = 'skipped';
  lead.assignedTo = null;
  lead.assignedBuyerId = null;
  lead.assignmentStatus = 'unassigned';
  lead.isDuplicate = true;
  lead.duplicateOf = duplicateResult.duplicateOf;
  lead.duplicateReason = duplicateResult.reason;
  lead.normalizedEmail = normalizeEmailForDedup(lead.email);
  lead.normalizedPhone = normalizePhoneForDedup(lead.phone);
  await lead.save();
  return lead;
}

async function checkLeadForDuplicate(lead, tenantId, options = {}) {
  if (lead.isDuplicate || lead.ingestionStatus === 'duplicate') {
    return { isDuplicate: true, duplicateOf: lead.duplicateOf, reason: lead.duplicateReason || 'duplicate' };
  }

  const windowHours = await resolveDedupWindowHours(tenantId, lead.campaignId, options);
  const duplicate = await findDuplicate({
    email: lead.email,
    phone: lead.phone,
    tenantId,
    windowHours,
    excludeLeadId: lead._id,
  });

  if (!duplicate) return { isDuplicate: false };

  if (lead.isNew === false && lead._id) {
    await markLeadAsDuplicate(lead, duplicate);
  }

  return {
    isDuplicate: true,
    duplicateOf: duplicate.duplicateOf,
    reason: duplicate.reason,
    matchedLead: duplicate.matchedLead,
  };
}

module.exports = {
  DEFAULT_DEDUP_WINDOW_HOURS,
  normalizeEmailForDedup,
  normalizePhoneForDedup,
  shouldBlockRouting,
  applyNormalizedFields,
  resolveDedupWindowHours,
  resolveOriginalLeadId,
  findDuplicate,
  buildDuplicateLeadData,
  markLeadAsDuplicate,
  checkLeadForDuplicate,
};
