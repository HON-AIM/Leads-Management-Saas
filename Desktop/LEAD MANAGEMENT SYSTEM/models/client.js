const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  state: { type: String, required: true },
  leadCap: { type: Number, required: true },
  leadsReceived: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'full', 'inactive'],
    default: 'active'
  },
  phone: String,
  address: String,
  createdAt: { type: Date, default: Date.now }
});

clientSchema.pre('save', function(next) {
  if (this.leadsReceived >= this.leadCap) {
    this.status = 'full';
  } else {
    this.status = 'active';
  }
  next();
});

module.exports = mongoose.model('Client', clientSchema);