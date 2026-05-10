const { chat } = require('./openaiClient');
const { buildSystemContext, getDiagnosticSummary } = require('./contextBuilder');
const {
  SYSTEM_PROMPT, QUERY_CLASSIFIER_PROMPT,
  buildContextPrompt, buildFollowupContext
} = require('./promptTemplates');
const {
  createSession, getSession, getActiveSessions,
  addUserMessage, addAssistantMessage, getMessagesForLLM,
  archiveSession, updateSessionContext
} = require('./conversationMemory');
const {
  generateCapRecommendations, generateRoutingRecommendations,
  generateFailureAnalysis, generateSystemDiagnostic,
  generateSourceQualityReport
} = require('./recommendationEngine');

const LOG_PREFIX = '[AIService]';

function log(step, details = {}) {
  const ts = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${ts} | Step: ${step}`, details);
}

async function startConversation(tenantId, userId, title) {
  log('CONVERSATION_START', { tenantId, userId });

  const session = await createSession(tenantId, userId, title);
  const context = await buildSystemContext(tenantId);
  await updateSessionContext(session._id, tenantId, {
    leadCount: context.leads.total,
    buyerCount: context.buyers.length,
    timestamp: new Date().toISOString()
  });

  const greeting = await generateGreeting(context);

  await addAssistantMessage(session._id, tenantId, greeting.content || greeting, greeting.usage || {});

  return {
    sessionId: session._id,
    message: greeting.content || greeting,
    usage: greeting.usage || { totalTokens: 0 }
  };
}

async function sendMessage(tenantId, userId, conversationId, message) {
  log('MESSAGE_RECEIVED', { conversationId, userId });

  await addUserMessage(conversationId, tenantId, message);

  const context = await buildSystemContext(tenantId);
  await updateSessionContext(conversationId, tenantId, {
    leadCount: context.leads.total,
    buyerCount: context.buyers.length,
    timestamp: new Date().toISOString()
  });

  const contextPrompt = buildContextPrompt(context);
  const historyMessages = await getMessagesForLLM(conversationId, tenantId, SYSTEM_PROMPT, 30);

  const userMsgIndex = historyMessages.findLastIndex(m => m.role === 'user');
  if (userMsgIndex >= 0) {
    historyMessages[userMsgIndex] = {
      role: 'user',
      content: `[Current System Context]\n${contextPrompt}\n\n[User Question]\n${message}`
    };
  }

  log('LLM_CALL_START', { conversationId, messageLength: message.length, historyLength: historyMessages.length });

  const queryType = await classifyQuery(message);

  let result;
  switch (queryType) {
    case 'cap_analysis':
      const capResult = await generateCapRecommendations(tenantId);
      result = {
        content: capResult.recommendations,
        usage: capResult.usage,
        type: 'cap_analysis'
      };
      break;
    case 'routing_analysis':
      const routingResult = await generateRoutingRecommendations(tenantId);
      result = {
        content: routingResult.recommendations,
        usage: routingResult.usage,
        type: 'routing_analysis'
      };
      break;
    case 'failure_analysis':
      const failureResult = await generateFailureAnalysis(tenantId);
      result = {
        content: failureResult.analysis,
        usage: failureResult.usage,
        type: 'failure_analysis'
      };
      break;
    case 'source_quality':
      const sourceResult = await generateSourceQualityReport(tenantId);
      result = {
        content: formatSourceReport(sourceResult),
        usage: { totalTokens: 0 },
        type: 'source_quality',
        data: sourceResult
      };
      break;
    case 'diagnostic':
      const diagnosticResult = await generateSystemDiagnostic(tenantId);
      result = {
        content: formatDiagnostic(diagnosticResult),
        usage: { totalTokens: 0 },
        type: 'diagnostic',
        data: diagnosticResult
      };
      break;
    case 'buyer_performance':
    case 'general_overview':
    case 'recommendation':
    default:
      result = await chat(historyMessages, { temperature: 0.3 });
      result.type = queryType;
      break;
  }

  log('LLM_CALL_COMPLETE', { conversationId, type: result.type, tokens: result.usage?.totalTokens || 0 });

  await addAssistantMessage(conversationId, tenantId, result.content, result.usage, { queryType: result.type });

  return {
    sessionId: conversationId,
    message: result.content,
    type: result.type,
    usage: result.usage
  };
}

async function classifyQuery(message) {
  const lower = message.toLowerCase();

  if (lower.includes('cap') || lower.includes('capacity') || lower.includes('limit') || lower.includes('full')) {
    return 'cap_analysis';
  }
  if (lower.includes('rout') || lower.includes('distribut') || lower.includes('imbalance') || lower.includes('round robin') || lower.includes('assign')) {
    return 'routing_analysis';
  }
  if (lower.includes('fail') || lower.includes('error') || lower.includes('broken') || lower.includes('issue') || lower.includes('problem') || lower.includes('unassign')) {
    return 'failure_analysis';
  }
  if (lower.includes('source') || lower.includes('quality') || lower.includes('channel') || lower.includes('facebook') || lower.includes('ghl') || lower.includes('webhook') || lower.includes('form')) {
    return 'source_quality';
  }
  if (lower.includes('diagnos') || lower.includes('health') || lower.includes('alert') || lower.includes('status') || lower.includes('issue') || lower.includes('wrong') || lower.includes('problem')) {
    return 'diagnostic';
  }
  if (lower.includes('buyer') || lower.includes('who') || lower.includes('most') || lower.includes('top') || lower.includes('perform')) {
    return 'buyer_performance';
  }
  if (lower.includes('recommend') || lower.includes('suggest') || lower.includes('advice') || lower.includes('improve') || lower.includes('optimize')) {
    return 'recommendation';
  }

  return 'general_overview';
}

async function generateGreeting(context) {
  const diagnostic = await getDiagnosticSummary(context.system?.name ? { tenantId: null } : null).catch(() => null);

  let greeting = `## AI Operations Assistant\n\nWelcome! I'm your AI operations copilot for the Lead Distribution SaaS.\n\n`;

  greeting += `Here's your current snapshot:\n`;
  greeting += `- **${context.leads.total}** total leads (${context.leads.today} today)\n`;
  greeting += `- **${context.clients.active}** active buyers of **${context.clients.total}** total\n`;
  greeting += `- **${context.leads.assigned}** leads assigned (${context.leads.assignmentRate}% assignment rate)\n`;
  greeting += `- **${context.delivery.successRate}%** delivery success rate\n`;

  if (parseInt(context.leads.unassigned) > 0) {
    greeting += `- ⚠️ **${context.leads.unassigned}** unassigned leads need attention\n`;
  }
  if (context.clients.capExhausted > 0) {
    greeting += `- ⚠️ **${context.clients.capExhausted}** buyers at full capacity\n`;
  }

  greeting += `\n**I can help you with:**\n`;
  greeting += `1. 🔍 **Why leads failed** — Analyze delivery and ingestion failures\n`;
  greeting += `2. 📊 **Who received the most leads** — Buyer performance and distribution\n`;
  greeting += `3. ⚡ **Cap issues** — Capacity utilization and recommendations\n`;
  greeting += `4. 🔄 **Routing imbalance** — Distribution analysis across states and modes\n`;
  greeting += `5. 📈 **Source quality insights** — Lead source performance comparison\n\n`;
  greeting += `What would you like to explore?`;

  return { content: greeting, usage: { totalTokens: 0 } };
}

function formatDiagnostic(diagnosticResult) {
  const { diagnostic, context } = diagnosticResult;

  let output = `## System Diagnostic Report\n\n`;
  output += `**Overall Status:** ${diagnostic.healthy ? '✅ Healthy' : '⚠️ Needs Attention'}\n`;
  output += `**Issues Found:** ${diagnostic.issueCount} (${diagnostic.highPriorityCount} high priority)\n\n`;

  if (diagnostic.issues.length > 0) {
    output += `### Issues\n\n`;
    for (const issue of diagnostic.issues) {
      const icon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
      output += `${icon} **${issue.category.toUpperCase()}**: ${issue.message}\n`;
      output += `   ${issue.details}\n\n`;
    }
  } else {
    output += `No issues detected. System is operating normally.\n\n`;
  }

  output += `### Quick Stats\n`;
  output += `- Leads: ${context.leadCount} | Buyers: ${context.clientCount}\n`;
  output += `- Delivery Success Rate: ${context.deliverySuccessRate}%\n`;
  output += `- Last Updated: ${context.timestamp}\n`;

  return output;
}

function formatSourceReport(sourceResult) {
  let output = `## Source Quality Report\n\n`;

  if (sourceResult.sources.length === 0) {
    output += `No lead source data available yet.\n`;
    return output;
  }

  output += `| Source | Volume | Assignment Rate | Quality Score | Rating |\n`;
  output += `|--------|--------|----------------|--------------|--------|\n`;

  for (const source of sourceResult.sources) {
    output += `| ${source.source} | ${source.volume} (${source.percentage}%) | ${source.assignmentRate}% | ${source.qualityScore}% | ${source.rating === 'good' ? '✅' : source.rating === 'fair' ? '⚠️' : '❌'} ${source.rating} |\n`;
  }

  output += `\n### Summary\n`;
  output += `- **Best Source:** ${sourceResult.topSource || 'N/A'}\n`;
  output += `- **Needs Attention:** ${sourceResult.worstSource || 'N/A'}\n`;
  output += `- ${sourceResult.summary}\n`;

  const poorSources = sourceResult.sources.filter(s => s.rating === 'poor');
  if (poorSources.length > 0) {
    output += `\n### Recommendations\n`;
    for (const s of poorSources) {
      output += `- Review ${s.source} integration: high ${s.failureRate > s.duplicateRate ? 'failure' : 'duplicate'} rate (${s.failureRate > s.duplicateRate ? s.failureRate + '% failures' : s.duplicateRate + '% duplicates'})\n`;
    }
  }

  return output;
}

module.exports = {
  startConversation,
  sendMessage,
  getActiveSessions: getActiveSessions,
  archiveSession,
  getSession,
  generateCapRecommendations,
  generateRoutingRecommendations,
  generateFailureAnalysis,
  generateSystemDiagnostic,
  generateSourceQualityReport
};
