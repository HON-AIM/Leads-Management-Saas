const mongoose = require('mongoose');

const routingStateSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  country: {
    type: String,
    default: 'US',
    uppercase: true
  },
  state: {
    type: String,
    required: true,
    uppercase: true
  },
  lastIndex: {
    type: Number,
    default: 0
  },
  version: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

routingStateSchema.index({ tenantId: 1, country: 1, state: 1 }, { unique: true });

module.exports = mongoose.model('RoutingState', routingStateSchema);
