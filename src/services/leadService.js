const Lead = require('../models/Lead');
const leadRepo = require('../repositories/leadRepository');
const Setting = require('../models/Setting');
const { normalizeEmailForDedup, normalizePhoneForDedup, shouldBlockDuplicate } = require('../utils/deduplication');
const { normalizeState } = require('../utils/stateNormalizer');
const { normalizePhone } = require('../utils/phone');
const logger = require('../utils/logger');

class LeadService {
  async create(data, tenantId) {
    const emailNorm = normalizeEmailForDedup(data.email);
    const phoneNorm = normalizePhoneForDedup(data.phone);
    const stateNorm = normalizeState(data.state);

    const lead = await leadRepo.create({
      ...data,
      emailNormalized: emailNorm,
      phoneNormalized: phoneNorm,
      phone: normalizePhone(data.phone) || data.phone,
      state: stateNorm || data.state?.toUpperCase(),
      tenantId,
    });

    const settings = await Setting.findOne({ tenantId }).lean().catch(() => null);
    const dedupWindow = settings?.dedupWindowHours || 720;

    const existingLead = await leadRepo.findDuplicate(emailNorm, phoneNorm, tenantId, dedupWindow);
    if (shouldBlockDuplicate(lead, existingLead)) {
      lead.isDuplicate = true;
      lead.duplicateOf = existingLead._id;
      await leadRepo.findByIdAndUpdate(lead._id, tenantId, {
        isDuplicate: true,
        duplicateOf: existingLead._id,
      });
      return lead;
    }

    return lead;
  }

  async getById(id, tenantId) {
    return leadRepo.findById(id, tenantId);
  }

  async list(tenantId, filters) {
    return leadRepo.findInTenant(tenantId, filters);
  }

  async update(id, tenantId, data) {
    return leadRepo.findByIdAndUpdate(id, tenantId, data);
  }

  async delete(id, tenantId) {
    return leadRepo.findByIdAndDelete(id, tenantId);
  }

  async getByBuyer(buyerId, tenantId, filters) {
    return leadRepo.findByBuyer(buyerId, tenantId, filters);
  }

  async markDelivered(id, tenantId) {
    return leadRepo.findByIdAndUpdate(id, tenantId, { status: 'delivered' });
  }

  async markFailed(id, tenantId) {
    return leadRepo.findByIdAndUpdate(id, tenantId, { status: 'failed' });
  }

  async countByStatus(tenantId) {
    return leadRepo.countByStatus(tenantId);
  }

  async countToday(tenantId) {
    return leadRepo.countToday(tenantId);
  }

  async countInTenant(tenantId) {
    return leadRepo.countInTenant(tenantId);
  }
}

module.exports = new LeadService();
