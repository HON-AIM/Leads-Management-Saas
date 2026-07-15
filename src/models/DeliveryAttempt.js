const mongoose = require('mongoose');

const deliveryAttemptSchema = new mongoose.Schema(
  {
    leadAssignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeadAssignment', required: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true },

    attemptNumber: { type: Number, required: true },
    payloadSent: { type: mongoose.Schema.Types.Mixed, required: true },
    webhookUrl: { type: String },

    statusCode: { type: Number },
    responseBody: { type: mongoose.Schema.Types.Mixed },
    responseHeaders: { type: mongoose.Schema.Types.Mixed },

    success: { type: Boolean, required: true },
    failureReason: { type: String },
    durationMs: { type: Number },

    triggeredBy: { type: String, enum: ['automatic', 'manual_retry'], default: 'automatic' },
    triggeredByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  },
  { timestamps: true }
);

deliveryAttemptSchema.index({ leadAssignmentId: 1, attemptNumber: 1 });
deliveryAttemptSchema.index({ leadId: 1, createdAt: -1 });
deliveryAttemptSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model('DeliveryAttempt', deliveryAttemptSchema);
