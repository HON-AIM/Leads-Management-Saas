const FieldDefinition = require('../models/FieldDefinition');

class FieldDefinitionRepository {
  async create(data) {
    return FieldDefinition.create(data);
  }

  async createMany(docs) {
    return FieldDefinition.insertMany(docs, { ordered: true }).catch(() => {
      return FieldDefinition.find({ campaignId: docs[0]?.campaignId, tenantId: docs[0]?.tenantId });
    });
  }

  async findById(id) {
    return FieldDefinition.findById(id);
  }

  async findByCampaign(campaignId, tenantId) {
    return FieldDefinition.find({ campaignId, tenantId }).sort({ isStandard: -1, createdAt: 1 });
  }

  async findByCampaignAndName(campaignId, fieldName, tenantId) {
    return FieldDefinition.findOne({ campaignId, fieldName, tenantId });
  }

  async findByIdAndUpdate(id, data) {
    return FieldDefinition.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async findByIdAndDelete(id) {
    return FieldDefinition.findByIdAndDelete(id);
  }

  async deleteByCampaign(campaignId) {
    return FieldDefinition.deleteMany({ campaignId });
  }

  async findRequiredByCampaign(campaignId, tenantId) {
    return FieldDefinition.find({ campaignId, tenantId, isRequired: true });
  }
}

module.exports = new FieldDefinitionRepository();
