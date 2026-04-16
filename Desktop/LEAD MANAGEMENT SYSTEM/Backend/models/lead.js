const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  state: { type: String, required: true },
  source: { type: String, default: 'form' },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  status: {
    type: String,
    enum: ['assigned', 'unassigned', 'pending', 'contacted', 'converted'],
    default: 'pending'
  },
  notes: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);