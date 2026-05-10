const mongoose = require('mongoose');

const regionSchema = new mongoose.Schema({
  country_iso2: { type: String, required: true, uppercase: true, index: true },
  name: { type: String, required: true },
  code: { type: String, required: true, uppercase: true },
  type: {
    type: String,
    enum: ['state', 'province', 'region', 'territory', 'prefecture', 'department', 'emirate', 'governorate', 'district'],
    default: 'state',
  },
  capital: String,
  timezone: String,
  active: { type: Boolean, default: true },
  aliases: [{ type: String, lowercase: true }],
}, { timestamps: true });

regionSchema.index({ country_iso2: 1, code: 1 }, { unique: true });
regionSchema.index({ country_iso2: 1, name: 1 });
regionSchema.index({ name: 'text', aliases: 'text' });

module.exports = mongoose.model('Region', regionSchema);
