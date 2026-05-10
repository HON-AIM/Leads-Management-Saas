const mongoose = require('mongoose');

const territorySchema = new mongoose.Schema({
  tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  country_code: { type: String, required: true, uppercase: true },
  regions: [{ type: String, uppercase: true }],
  cities: [String],
  postal_codes: [String],
  active: { type: Boolean, default: true },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

territorySchema.index({ tenant_id: 1, active: 1 });
territorySchema.index({ tenant_id: 1, country_code: 1 });
territorySchema.index({ tenant_id: 1, regions: 1 });

module.exports = mongoose.model('Territory', territorySchema);
