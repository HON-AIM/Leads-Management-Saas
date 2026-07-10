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

  async isEligible(buyer, lead) {
    if (buyer.status !== 'active') return false;
    if (buyer.leadCap > 0 && buyer.leadsReceived >= buyer.leadCap) return false;
    if (buyer.dailyCap > 0 && buyer.dailyLeadsReceived >= buyer.dailyCap) return false;
    if (buyer.monthlyCap > 0 && buyer.monthlyLeadsReceived >= buyer.monthlyCap) return false;
    if (buyer.allowedStates.length > 0 && lead.state && !buyer.allowedStates.includes(lead.state)) return false;
    if (buyer.schedule?.enabled) {
      const now = new Date();
      const tz = buyer.schedule.timezone || 'America/New_York';
      const localTime = new Date(now.toLocaleString('en-US', { timeZone: tz }));
      const dayOfWeek = localTime.getDay();
      if (buyer.schedule.days.length > 0 && !buyer.schedule.days.includes(dayOfWeek)) return false;
      const hours = localTime.getHours();
      const minutes = localTime.getMinutes();
      const currentMinutes = hours * 60 + minutes;
      const [startH, startM] = (buyer.schedule.startTime || '09:00').split(':').map(Number);
      const [endH, endM] = (buyer.schedule.endTime || '17:00').split(':').map(Number);
      if (currentMinutes < startH * 60 + startM || currentMinutes > endH * 60 + endM) return false;
    }
    return true;
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
