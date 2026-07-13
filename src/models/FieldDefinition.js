const mongoose = require('mongoose');

const fieldDefinitionSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    fieldName: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['String', 'Number', 'Boolean', 'Phone', 'Email', 'List', 'Date'], default: 'String' },
    isStandard: { type: Boolean, default: false },
    isRequired: { type: Boolean, default: false },
    visibleInPortal: { type: Boolean, default: true },
    listOptions: [{ type: String }],
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  },
  { timestamps: true }
);

fieldDefinitionSchema.index({ campaignId: 1, fieldName: 1 }, { unique: true });
fieldDefinitionSchema.index({ tenantId: 1, campaignId: 1 });

module.exports = mongoose.model('FieldDefinition', fieldDefinitionSchema);
