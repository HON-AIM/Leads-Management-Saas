const mongoose = require('mongoose');

const regionAliasSchema = new mongoose.Schema({
  country_iso2: { type: String, required: true, uppercase: true },
  raw_input: { type: String, required: true, lowercase: true },
  normalized_region_code: { type: String, required: true, uppercase: true },
  confidence_weight: { type: Number, default: 1, min: 0, max: 1 },
}, { timestamps: true });

regionAliasSchema.index({ raw_input: 1, country_iso2: 1 }, { unique: true });
regionAliasSchema.index({ country_iso2: 1, normalized_region_code: 1 });

module.exports = mongoose.model('RegionAlias', regionAliasSchema);
