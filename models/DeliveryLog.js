const mongoose = require('mongoose');

const deliveryLogSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  provider: {
    type: String,
    required: true
  },
  attempt: {
    type: Number,
    required: true,
    default: 1
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'retrying'],
    required: true
  },
  requestPayload: mongoose.Schema.Types.Mixed,
  responsePayload: mongoose.Schema.Types.Mixed,
  responseCode: Number,
  duration: Number,
  error: String,
  deliveredAt: Date
}, { timestamps: true });

deliveryLogSchema.index({ leadId: 1, attempt: -1 });
deliveryLogSchema.index({ leadId: 1, status: 1 });
deliveryLogSchema.index({ tenantId: 1, createdAt: -1 });
deliveryLogSchema.index({ buyerId: 1, createdAt: -1 });
deliveryLogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('DeliveryLog', deliveryLogSchema);
