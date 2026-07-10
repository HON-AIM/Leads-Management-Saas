const Campaign = require('../models/Campaign');
const campaignRepo = require('../repositories/campaignRepository');
const Buyer = require('../models/Buyer');
const logger = require('../utils/logger');

class CampaignService {
  async create(data, tenantId) {
    return campaignRepo.create({ ...data, tenantId });
  }

  async getById(id, tenantId) {
    return campaignRepo.findById(id, tenantId);
  }

  async list(tenantId, filters) {
    return campaignRepo.findInTenant(tenantId, filters);
  }

  async update(id, tenantId, data) {
    return campaignRepo.findByIdAndUpdate(id, tenantId, data);
  }

  async delete(id, tenantId) {
    return campaignRepo.findByIdAndDelete(id, tenantId);
  }

  async addBuyer(campaignId, tenantId, buyerId, config = {}) {
    const campaign = await campaignRepo.findById(campaignId, tenantId);
    if (!campaign) throw new Error('Campaign not found');
    if (campaign.assignedBuyers.some((b) => b.buyerId.toString() === buyerId)) {
      throw new Error('Buyer already assigned to campaign');
    }
    campaign.assignedBuyers.push({ buyerId, weight: config.weight || 1, priority: config.priority || 0 });
    await campaignRepo.save(campaign);
    return campaign;
  }

  async removeBuyer(campaignId, tenantId, buyerId) {
    const campaign = await campaignRepo.findById(campaignId, tenantId);
    if (!campaign) throw new Error('Campaign not found');
    campaign.assignedBuyers = campaign.assignedBuyers.filter((b) => b.buyerId.toString() !== buyerId);
    await campaignRepo.save(campaign);
    return campaign;
  }

  async getActiveInTenant(tenantId) {
    return campaignRepo.findActiveInTenant(tenantId);
  }
}

module.exports = new CampaignService();
