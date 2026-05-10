const express = require('express');
const { authenticate, requirePermission, tenantIsolation } = require('../middleware/auth');
const aiService = require('../services/ai/aiService');
const AISession = require('../models/Conversation');

const router = express.Router();

const LOG_PREFIX = '[AIRoutes]';

function log(step, details = {}) {
  const ts = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${ts} | Step: ${step}`, details);
}

const aiAuth = [authenticate, tenantIsolation];

router.post('/chat/start', ...aiAuth, requirePermission('analytics', 'read'), async (req, res) => {
  try {
    log('CHAT_START', { userId: req.user._id, tenantId: req.tenantId });

    const { title } = req.body;
    const result = await aiService.startConversation(req.tenantId, req.user._id, title);

    res.json({
      success: true,
      sessionId: result.sessionId,
      message: result.message,
      usage: result.usage
    });
  } catch (error) {
    log('CHAT_START_ERROR', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/chat/message', ...aiAuth, requirePermission('analytics', 'read'), async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'message is required' });
    }

    const session = await aiService.getSession(sessionId, req.tenantId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    log('CHAT_MESSAGE', { sessionId, userId: req.user._id });

    const result = await aiService.sendMessage(req.tenantId, req.user._id, sessionId, message);

    res.json({
      success: true,
      sessionId: result.sessionId,
      message: result.message,
      type: result.type,
      usage: result.usage
    });
  } catch (error) {
    log('CHAT_MESSAGE_ERROR', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/chat/sessions', ...aiAuth, requirePermission('analytics', 'read'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const sessions = await aiService.getActiveSessions(req.tenantId, req.user._id, limit);

    res.json({
      success: true,
      sessions: sessions.map(s => ({
        id: s._id,
        title: s.title,
        messageCount: s.metadata?.messageCount || 0,
        lastActivityAt: s.metadata?.lastActivityAt,
        createdAt: s.createdAt
      }))
    });
  } catch (error) {
    log('LIST_SESSIONS_ERROR', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/chat/sessions/:id', ...aiAuth, requirePermission('analytics', 'read'), async (req, res) => {
  try {
    const session = await aiService.getSession(req.params.id, req.tenantId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const messages = session.messages.map(m => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt
    }));

    res.json({
      success: true,
      session: {
        id: session._id,
        title: session.title,
        messages,
        metadata: session.metadata,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }
    });
  } catch (error) {
    log('GET_SESSION_ERROR', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/chat/sessions/:id/archive', ...aiAuth, requirePermission('analytics', 'read'), async (req, res) => {
  try {
    await aiService.archiveSession(req.params.id, req.tenantId);
    res.json({ success: true, message: 'Session archived' });
  } catch (error) {
    log('ARCHIVE_SESSION_ERROR', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/recommendations/caps', ...aiAuth, requirePermission('analytics', 'read'), async (req, res) => {
  try {
    log('CAP_RECOMMENDATIONS', { tenantId: req.tenantId });
    const result = await aiService.generateCapRecommendations(req.tenantId);
    res.json({
      success: true,
      recommendations: result.recommendations,
      context: result.context
    });
  } catch (error) {
    log('CAP_RECOMMENDATIONS_ERROR', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/recommendations/routing', ...aiAuth, requirePermission('analytics', 'read'), async (req, res) => {
  try {
    log('ROUTING_RECOMMENDATIONS', { tenantId: req.tenantId });
    const result = await aiService.generateRoutingRecommendations(req.tenantId);
    res.json({
      success: true,
      recommendations: result.recommendations,
      context: result.context
    });
  } catch (error) {
    log('ROUTING_RECOMMENDATIONS_ERROR', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/analysis/failures', ...aiAuth, requirePermission('analytics', 'read'), async (req, res) => {
  try {
    log('FAILURE_ANALYSIS', { tenantId: req.tenantId });
    const result = await aiService.generateFailureAnalysis(req.tenantId);
    res.json({
      success: true,
      analysis: result.analysis,
      context: result.context
    });
  } catch (error) {
    log('FAILURE_ANALYSIS_ERROR', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/analysis/sources', ...aiAuth, requirePermission('analytics', 'read'), async (req, res) => {
  try {
    log('SOURCE_QUALITY', { tenantId: req.tenantId });
    const result = await aiService.generateSourceQualityReport(req.tenantId);
    res.json({
      success: true,
      sources: result.sources,
      summary: result.summary,
      topSource: result.topSource,
      worstSource: result.worstSource
    });
  } catch (error) {
    log('SOURCE_QUALITY_ERROR', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/diagnostic', ...aiAuth, requirePermission('analytics', 'read'), async (req, res) => {
  try {
    log('SYSTEM_DIAGNOSTIC', { tenantId: req.tenantId });
    const result = await aiService.generateSystemDiagnostic(req.tenantId);
    res.json({
      success: true,
      diagnostic: result.diagnostic,
      context: result.context
    });
  } catch (error) {
    log('SYSTEM_DIAGNOSTIC_ERROR', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
