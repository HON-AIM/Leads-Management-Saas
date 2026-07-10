const Setting = require('../models/Setting');
const settingRepo = require('../repositories/settingRepository');

class SettingService {
  async get(tenantId) {
    return settingRepo.findOrCreate(tenantId);
  }

  async update(tenantId, data) {
    return settingRepo.update(tenantId, data);
  }
}

module.exports = new SettingService();
