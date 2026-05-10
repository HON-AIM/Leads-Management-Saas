const Conversation = require('../../models/Conversation');

const LOG_PREFIX = '[AIMemory]';
const MAX_HISTORY_TOKENS = 6000;

function log(step, details = {}) {
  const ts = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${ts} | Step: ${step}`, details);
}

function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}

async function createSession(tenantId, userId, title = 'AI Assistant Session') {
  const conversation = await Conversation.create({
    tenantId,
    userId,
    title,
    messages: [],
    metadata: {
      totalTokens: 0,
      messageCount: 0,
      lastActivityAt: new Date()
    },
    status: 'active'
  });

  log('SESSION_CREATED', { conversationId: conversation._id, userId });
  return conversation;
}

async function getSession(conversationId, tenantId) {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    tenantId,
    status: 'active'
  });

  return conversation;
}

async function getActiveSessions(tenantId, userId, limit = 10) {
  return Conversation.find({
    tenantId,
    userId,
    status: 'active'
  })
    .select('title metadata.messageCount metadata.lastActivityAt createdAt updatedAt')
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();
}

async function addUserMessage(conversationId, tenantId, content, metadata = {}) {
  const tokens = estimateTokens(content);

  const conversation = await Conversation.findOneAndUpdate(
    { _id: conversationId, tenantId, status: 'active' },
    {
      $push: {
        messages: {
          role: 'user',
          content,
          tokens,
          metadata,
          createdAt: new Date()
        }
      },
      $inc: {
        'metadata.totalTokens': tokens,
        'metadata.messageCount': 1
      },
      $set: { 'metadata.lastActivityAt': new Date() }
    },
    { new: true }
  );

  if (conversation) {
    conversation.trimMessages(MAX_HISTORY_TOKENS);
    await conversation.save();
  }

  return conversation;
}

async function addAssistantMessage(conversationId, tenantId, content, usage = {}, metadata = {}) {
  const tokens = usage.completionTokens || estimateTokens(content);

  const conversation = await Conversation.findOneAndUpdate(
    { _id: conversationId, tenantId, status: 'active' },
    {
      $push: {
        messages: {
          role: 'assistant',
          content,
          tokens,
          metadata: { ...metadata, usage },
          createdAt: new Date()
        }
      },
      $inc: {
        'metadata.totalTokens': tokens,
        'metadata.messageCount': 1
      },
      $set: { 'metadata.lastActivityAt': new Date() }
    },
    { new: true }
  );

  return conversation;
}

async function getConversationHistory(conversationId, tenantId, limit = 20) {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    tenantId,
    status: 'active'
  });

  if (!conversation) return [];

  return conversation.getRecentMessages(limit);
}

async function getMessagesForLLM(conversationId, tenantId, systemMessage, limit = 20) {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    tenantId,
    status: 'active'
  });

  if (!conversation) return [{ role: 'system', content: systemMessage }];

  const recentMessages = conversation.getRecentMessages(limit);
  const messages = [
    { role: 'system', content: systemMessage },
    ...recentMessages.map(m => ({
      role: m.role,
      content: m.content
    }))
  ];

  return messages;
}

async function archiveSession(conversationId, tenantId) {
  return Conversation.findOneAndUpdate(
    { _id: conversationId, tenantId },
    { $set: { status: 'archived' } }
  );
}

async function deleteSession(conversationId, tenantId) {
  return Conversation.findOneAndUpdate(
    { _id: conversationId, tenantId },
    { $set: { status: 'deleted' } }
  );
}

async function updateSessionContext(conversationId, tenantId, snapshot) {
  return Conversation.findOneAndUpdate(
    { _id: conversationId, tenantId },
    {
      $set: {
        'context.snapshot': snapshot,
        'context.lastRefreshedAt': new Date()
      }
    }
  );
}

async function getSessionTokenUsage(conversationId, tenantId) {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    tenantId
  }).select('metadata.totalTokens metadata.messageCount');

  if (!conversation) return null;

  return {
    totalTokens: conversation.metadata.totalTokens,
    messageCount: conversation.metadata.messageCount,
    estimatedCost: (conversation.metadata.totalTokens / 1000) * 0.002
  };
}

module.exports = {
  createSession,
  getSession,
  getActiveSessions,
  addUserMessage,
  addAssistantMessage,
  getConversationHistory,
  getMessagesForLLM,
  archiveSession,
  deleteSession,
  updateSessionContext,
  getSessionTokenUsage,
  estimateTokens
};
