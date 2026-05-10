const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  iso2: { type: String, required: true, unique: true, uppercase: true },
  iso3: { type: String, required: true, uppercase: true },
  phone_code: { type: String, required: true },
  phone_min_length: { type: Number, default: 7 },
  phone_max_length: { type: Number, default: 15 },
  currency: String,
  timezone: String,
  capital: String,
  continent: String,
  languages: [String],
  active: { type: Boolean, default: true },
  aliases: [{ type: String, lowercase: true }],
}, { timestamps: true });

countrySchema.index({ name: 'text', aliases: 'text' });
countrySchema.index({ phone_code: 1 });
countrySchema.index({ iso3: 1 });

module.exports = mongoose.model('Country', countrySchema);
