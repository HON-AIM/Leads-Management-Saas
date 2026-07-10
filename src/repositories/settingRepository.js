const Setting = require('../models/Setting');

class SettingRepository {
  async findOrCreate(tenantId) {
    let settings = await Setting.findOne({ tenantId });
    if (!settings) {
      settings = await Setting.create({ tenantId });
    }
    return settings;
  }

  async update(tenantId, data) {
    const allowed = ['dedupWindowHours', 'defaultRoutingMode', 'deliveryTimeout', 'maxRetries', 'businessHours'];
    const update = {};
    for (const key of allowed) {
      if (data[key] !== undefined) update[key] = data[key];
    }
    return Setting.findOneAndUpdate({ tenantId }, { $set: update }, { new: true, upsert: true });
  }
}

module.exports = new SettingRepository();
