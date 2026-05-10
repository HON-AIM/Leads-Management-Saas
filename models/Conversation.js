const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: { type: String, required: true },
  tokens: { type: Number, default: 0 },
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

const conversationSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: { type: String, default: 'AI Assistant Session' },
  messages: [messageSchema],
  context: {
    lastRefreshedAt: Date,
    snapshot: mongoose.Schema.Types.Mixed
  },
  metadata: {
    totalTokens: { type: Number, default: 0 },
    messageCount: { type: Number, default: 0 },
    lastActivityAt: Date
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  }
}, { timestamps: true });

conversationSchema.index({ tenantId: 1, userId: 1, status: 1 });
conversationSchema.index({ tenantId: 1, updatedAt: -1 });
conversationSchema.index({ userId: 1, updatedAt: -1 });

conversationSchema.methods.addMessage = function(role, content, tokens = 0, metadata = {}) {
  this.messages.push({ role, content, tokens, metadata });
  this.metadata.messageCount = this.messages.length;
  this.metadata.totalTokens += tokens;
  this.metadata.lastActivityAt = new Date();
  return this.save();
};

conversationSchema.methods.getRecentMessages = function(limit = 20) {
  return this.messages.slice(-limit).filter(m => m.role !== 'system');
};

conversationSchema.methods.getTokenCount = function() {
  return this.messages.reduce((sum, m) => sum + (m.tokens || 0), 0);
};

conversationSchema.methods.trimMessages = function(maxTokens = 8000) {
  while (this.getTokenCount() > maxTokens && this.messages.length > 4) {
    const firstUserIdx = this.messages.findIndex(m => m.role === 'user');
    if (firstUserIdx > 0) {
      this.messages.splice(1, 1);
    } else {
      break;
    }
  }
};

module.exports = mongoose.model('Conversation', conversationSchema);
