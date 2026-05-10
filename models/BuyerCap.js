const mongoose = require('mongoose');

const buyerCapSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  date: {
    type: String,
    required: true
  },
  yearMonth: {
    type: String,
    required: true
  },
  leadsReceived: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

buyerCapSchema.index({ buyerId: 1, date: 1 }, { unique: true });
buyerCapSchema.index({ buyerId: 1, yearMonth: 1 }, { unique: true });
buyerCapSchema.index({ tenantId: 1, date: 1 });
buyerCapSchema.index({ tenantId: 1, yearMonth: 1 });

module.exports = mongoose.model('BuyerCap', buyerCapSchema);
