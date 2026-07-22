const fieldDefinitionRepo = require('../repositories/fieldDefinitionRepository');

const STANDARD_FIELDS = [
  { fieldName: 'first_name', description: 'First name of the lead', type: 'String', isStandard: true, isRequired: true },
  { fieldName: 'last_name', description: 'Last name of the lead', type: 'String', isStandard: true, isRequired: true },
  { fieldName: 'full_name', description: 'Full name — auto-splits into first_name/last_name if first_name/last_name are not separately provided', type: 'String', isStandard: true, isRequired: false },
  { fieldName: 'phone', description: 'Phone number of the lead', type: 'Phone', isStandard: true, isRequired: true },
  { fieldName: 'email', description: 'Email address of the lead', type: 'Email', isStandard: true, isRequired: true },
  { fieldName: 'campaign_id', description: "Identifies which campaign the lead belongs to — auto-populated, always equals this campaign's ID", type: 'String', isStandard: true, isRequired: true },
  { fieldName: 'supplier_id', description: 'Identifies which supplier sent the lead — Supplier tracking not yet active', type: 'String', isStandard: true, isRequired: false },
];

class FieldDefinitionService {
  async seedStandardFields(campaignId, tenantId) {
    const docs = STANDARD_FIELDS.map((f) => ({
      ...f,
      campaignId,
      tenantId,
      visibleInPortal: true,
    }));
    return fieldDefinitionRepo.createMany(docs);
  }

  async listByCampaign(campaignId, tenantId) {
    return fieldDefinitionRepo.findByCampaign(campaignId, tenantId);
  }

  async getById(id) {
    return fieldDefinitionRepo.findById(id);
  }

  async create(data, tenantId) {
    if (data.isStandard) throw new Error('Cannot create standard fields via API');
    return fieldDefinitionRepo.create({ ...data, tenantId });
  }

  async update(id, data) {
    if (data.isStandard === false || data.isStandard === true) {
      const existing = await fieldDefinitionRepo.findById(id);
      if (existing && existing.isStandard) throw new Error('Cannot change isStandard on existing fields');
    }
    if (data.fieldName) {
      const existing = await fieldDefinitionRepo.findById(id);
      if (existing && existing.isStandard) throw new Error('Cannot rename standard fields');
    }
    return fieldDefinitionRepo.findByIdAndUpdate(id, data);
  }

  async delete(id) {
    const field = await fieldDefinitionRepo.findById(id);
    if (!field) throw new Error('Field not found');
    if (field.isStandard) throw new Error('Standard fields cannot be deleted.');
    return fieldDefinitionRepo.findByIdAndDelete(id);
  }

  async importFromCampaign(targetCampaignId, sourceCampaignId, tenantId) {
    const sourceFields = await fieldDefinitionRepo.findByCampaign(sourceCampaignId, tenantId);
    const existingTarget = await fieldDefinitionRepo.findByCampaign(targetCampaignId, tenantId);
    const existingNames = new Set(existingTarget.map((f) => f.fieldName));

    const toCreate = sourceFields
      .filter((f) => !f.isStandard && !existingNames.has(f.fieldName))
      .map((f) => ({
        campaignId: targetCampaignId,
        fieldName: f.fieldName,
        description: f.description,
        type: f.type,
        isStandard: false,
        isRequired: f.isRequired,
        visibleInPortal: f.visibleInPortal,
        listOptions: f.listOptions,
        tenantId,
      }));

    if (toCreate.length > 0) {
      await fieldDefinitionRepo.createMany(toCreate);
    }
    return fieldDefinitionRepo.findByCampaign(targetCampaignId, tenantId);
  }

  async validateRequiredFields(campaignId, tenantId, payload) {
    const requiredFields = await fieldDefinitionRepo.findRequiredByCampaign(campaignId, tenantId);
    if (!requiredFields.length) return { valid: true, missing: [] };

    const has = (field) => {
      const v = payload[field];
      return v !== undefined && v !== null && v !== '';
    };

    const hasNameParts = has('first_name') || has('last_name') || has('full_name');
    const hasFullName = has('name') || has('full_name');

    const missing = [];
    for (const field of requiredFields) {
      if (has(field.fieldName)) continue;

      if (field.fieldName === 'name' && hasNameParts) continue;
      if (field.fieldName === 'first_name' && hasFullName) continue;
      if (field.fieldName === 'last_name' && hasFullName) continue;

      missing.push(field.fieldName);
    }

    return { valid: missing.length === 0, missing };
  }
}

module.exports = new FieldDefinitionService();
