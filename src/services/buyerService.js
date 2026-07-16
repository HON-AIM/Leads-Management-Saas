const Buyer = require('../models/Buyer');
const buyerRepo = require('../repositories/buyerRepository');
const logger = require('../utils/logger');

class BuyerService {
  async create(data, tenantId) {
    return buyerRepo.create({ ...data, tenantId });
  }

  async getById(id, tenantId) {
    return buyerRepo.findById(id, tenantId);
  }

  async list(tenantId, filters) {
    return buyerRepo.findInTenant(tenantId, filters);
  }

  async update(id, tenantId, data) {
    return buyerRepo.findByIdAndUpdate(id, tenantId, data);
  }

  async delete(id, tenantId) {
    return buyerRepo.findByIdAndDelete(id, tenantId);
  }

  async incrementCaps(buyerId, tenantId) {
    return buyerRepo.incrementCaps(buyerId, tenantId);
  }

  async resetDailyCaps(tenantId) {
    return buyerRepo.resetDailyCaps(tenantId);
  }

  async resetMonthlyCaps(tenantId) {
    return buyerRepo.resetMonthlyCaps(tenantId);
  }

  async getActiveInTenant(tenantId) {
    return buyerRepo.findActiveInTenant(tenantId);
  }
}

module.exports = new BuyerService();
