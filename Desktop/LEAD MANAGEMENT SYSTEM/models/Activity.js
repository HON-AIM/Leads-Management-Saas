const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['lead_received', 'lead_assigned', 'client_created', 'client_updated', 'client_deleted', 'lead_cap_reset'],
    required: true
  },
  message: { type: String, required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
