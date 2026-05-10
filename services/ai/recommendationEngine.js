const { buildSystemContext, getBuyerCapSummary, getDiagnosticSummary } = require('./contextBuilder');
const { chat } = require('./openaiClient');
const { SYSTEM_PROMPT, CAP_RECOMMENDATION_PROMPT, ROUTING_ANALYSIS_PROMPT, FAILURE_ANALYSIS_PROMPT, buildContextPrompt } = require('./promptTemplates');

const LOG_PREFIX = '[AIRecommendations]';

function log(step, details = {}) {
  const ts = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${ts} | Step: ${step}`, details);
}

async function generateCapRecommendations(tenantId) {
  log('CAP_RECOMMENDATIONS_START', { tenantId });

  const context = await buildSystemContext(tenantId);
  const contextPrompt = buildContextPrompt(context);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: CAP_RECOMMENDATION_PROMPT },
    { role: 'user', content: `Here is the current system data:\n\n${contextPrompt}\n\nBased on this data, provide specific cap adjustment recommendations for each buyer. Include whether to increase or decrease caps and by how much.` }
  ];

  try {
    const result = await chat(messages, { temperature: 0.2 });

    log('CAP_RECOMMENDATIONS_COMPLETE', { tokens: result.usage.totalTokens });

    return {
      recommendations: result.content,
      usage: result.usage,
      context: {
        buyerCount: context.buyers.length,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    log('CAP_RECOMMENDATIONS_FAILED', { error: error.message });
    return generateFallbackCapRecommendations(context);
  }
}

async function generateRoutingRecommendations(tenantId) {
  log('ROUTING_RECOMMENDATIONS_START', { tenantId });

  const context = await buildSystemContext(tenantId);
  const contextPrompt = buildContextPrompt(context);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: ROUTING_ANALYSIS_PROMPT },
    { role: 'user', content: `Here is the current system data:\n\n${contextPrompt}\n\nAnalyze the routing configuration and provide specific recommendations to improve distribution balance.` }
  ];

  try {
    const result = await chat(messages, { temperature: 0.2 });

    log('ROUTING_RECOMMENDATIONS_COMPLETE', { tokens: result.usage.totalTokens });

    return {
      recommendations: result.content,
      usage: result.usage,
      context: {
        stateCount: context.routing.stateCount,
        buyerCount: context.routing.buyers.length,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    log('ROUTING_RECOMMENDATIONS_FAILED', { error: error.message });
    return generateFallbackRoutingRecommendations(context);
  }
}

async function generateFailureAnalysis(tenantId) {
  log('FAILURE_ANALYSIS_START', { tenantId });

  const context = await buildSystemContext(tenantId);
  const contextPrompt = buildContextPrompt(context);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: FAILURE_ANALYSIS_PROMPT },
    { role: 'user', content: `Here is the current system data:\n\n${contextPrompt}\n\nAnalyze the recent failures and provide root cause analysis with specific recommendations.` }
  ];

  try {
    const result = await chat(messages, { temperature: 0.2 });

    log('FAILURE_ANALYSIS_COMPLETE', { tokens: result.usage.totalTokens });

    return {
      analysis: result.content,
      usage: result.usage,
      context: {
        failedDeliveries: context.delivery.failed,
        failedIngestion: context.leads.failedIngestion,
        unassignedLeads: context.leads.unassigned,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    log('FAILURE_ANALYSIS_FAILED', { error: error.message });
    return generateFallbackFailureAnalysis(context);
  }
}

async function generateSystemDiagnostic(tenantId) {
  log('SYSTEM_DIAGNOSTIC_START', { tenantId });

  const diagnostic = await getDiagnosticSummary(tenantId);
  const context = await buildSystemContext(tenantId);

  return {
    diagnostic,
    context: {
      leadCount: context.leads.total,
      clientCount: context.clients.total,
      deliverySuccessRate: context.delivery.successRate,
      timestamp: new Date().toISOString()
    }
  };
}

async function generateSourceQualityReport(tenantId) {
  log('SOURCE_QUALITY_START', { tenantId });

  const context = await buildSystemContext(tenantId);
  const sources = context.sources;

  const report = sources.map(s => {
    const qualityScore = calculateSourceQuality(s);
    return {
      source: s.source,
      volume: s.count,
      percentage: s.percentage,
      assignmentRate: s.assignmentRate,
      duplicateRate: s.count > 0 ? ((s.duplicate / s.count) * 100).toFixed(1) : '0',
      failureRate: s.count > 0 ? ((s.failed / s.count) * 100).toFixed(1) : '0',
      qualityScore: qualityScore,
      rating: qualityScore >= 80 ? 'good' : qualityScore >= 50 ? 'fair' : 'poor'
    };
  });

  const topSource = report.reduce((best, s) =>
    parseFloat(s.qualityScore) > parseFloat(best.qualityScore) ? s : best
  , report[0]);

  const worstSource = report.reduce((worst, s) =>
    parseFloat(s.qualityScore) < parseFloat(worst.qualityScore) ? s : worst
  , report[0]);

  log('SOURCE_QUALITY_COMPLETE', { sourceCount: report.length });

  return {
    sources: report,
    topSource: topSource?.source || null,
    worstSource: worstSource?.source || null,
    summary: report.length > 0
      ? `Best source: ${topSource?.source} (score: ${topSource?.qualityScore}), Needs attention: ${worstSource?.source} (score: ${worstSource?.qualityScore})`
      : 'No source data available',
    timestamp: new Date().toISOString()
  };
}

function calculateSourceQuality(source) {
  const assignmentWeight = 0.4;
  const duplicatePenalty = 0.2;
  const failurePenalty = 0.2;
  const volumeWeight = 0.2;

  const assignmentScore = parseFloat(source.assignmentRate) || 0;
  const duplicateScore = 100 - (parseFloat(source.duplicateRate) || 0);
  const failureScore = 100 - (parseFloat(source.failureRate) || 0);
  const volumeScore = Math.min(100, (source.count / 100) * 100);

  const quality = (
    (assignmentScore * assignmentWeight) +
    (duplicateScore * duplicatePenalty) +
    (failureScore * failurePenalty) +
    (volumeScore * volumeWeight)
  );

  return Math.round(Math.min(100, Math.max(0, quality)));
}

function generateFallbackCapRecommendations(context) {
  const recommendations = [];
  const buyers = context.buyers;

  for (const buyer of buyers) {
    if (buyer.caps.lifetime.utilization !== 'unlimited') {
      const util = parseFloat(buyer.caps.lifetime.utilization);
      if (util >= 90) {
        recommendations.push(`URGENT: ${buyer.name} has used ${util}% of lifetime cap (${buyer.caps.lifetime.used}/${buyer.caps.lifetime.cap}). Increase cap by at least 50% to prevent routing failures.`);
      } else if (util >= 75) {
        recommendations.push(`WARNING: ${buyer.name} is at ${util}% lifetime cap utilization. Consider increasing cap by 25-50% soon.`);
      }
    }
    if (buyer.caps.daily.utilization !== 'unlimited') {
      const dailyUtil = parseFloat(buyer.caps.daily.utilization);
      if (dailyUtil >= 85) {
        recommendations.push(`NOTE: ${buyer.name} has used ${dailyUtil}% of daily cap. Consider raising daily limit.`);
      }
    }
  }

  const underutilized = buyers.filter(b =>
    b.caps.lifetime.utilization !== 'unlimited' && parseFloat(b.caps.lifetime.utilization) < 30
  );
  if (underutilized.length > 0) {
    recommendations.push(`Underutilized buyers (${underutilized.map(b => b.name).join(', ')}). Review their state targeting or routing configuration.`);
  }

  return {
    recommendations: recommendations.length > 0
      ? `## Cap Adjustment Recommendations\n\n${recommendations.join('\n\n')}`
      : '## Cap Analysis\n\nAll buyers have sufficient cap capacity. No immediate adjustments needed.',
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    context: { buyerCount: buyers.length, timestamp: new Date().toISOString() }
  };
}

function generateFallbackRoutingRecommendations(context) {
  const recommendations = [];

  const coverage = new Set(context.buyers.map(b => b.state));
  const statesWithRouting = new Set(context.routing.states.map(s => s.state));
  const uncovered = [...statesWithRouting].filter(s => !coverage.has(s));

  if (uncovered.length > 0) {
    recommendations.push(`No buyers for states: ${uncovered.join(', ')}. Add buyers or configure fallback groups for these states.`);
  }

  const pausedBuyers = context.buyers.filter(b => b.status === 'paused');
  if (pausedBuyers.length > 0) {
    recommendations.push(`${pausedBuyers.length} buyers are paused (${pausedBuyers.map(b => b.name).join(', ')}). Reactivate if capacity is needed.`);
  }

  const roundRobinBuyers = context.buyers.filter(b => b.routingMode === 'round_robin');
  if (roundRobinBuyers.length > 3 && context.routing.states.length > 0) {
    recommendations.push(`${roundRobinBuyers.length} buyers use round-robin routing. Consider using weighted routing if buyers have different capacities.`);
  }

  return {
    recommendations: recommendations.length > 0
      ? `## Routing Recommendations\n\n${recommendations.join('\n\n')}`
      : '## Routing Analysis\n\nRouting configuration looks balanced. No immediate issues detected.',
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    context: {
      stateCount: context.routing.stateCount,
      buyerCount: context.buyers.length,
      timestamp: new Date().toISOString()
    }
  };
}

function generateFallbackFailureAnalysis(context) {
  const issues = [];

  if (context.delivery.failed > 0) {
    issues.push(`${context.delivery.failed} delivery failures (${context.delivery.successRate}% success rate). Check provider connectivity and webhook configurations.`);
  }

  if (context.leads.failedIngestion > 0) {
    issues.push(`${context.leads.failedIngestion} leads failed ingestion. Review data quality at ingestion points.`);
  }

  if (context.leads.unassigned > 0) {
    const byState = context.routing.unassignedLeads.byState || [];
    const stateDetails = byState.map(s => `${s.state}: ${s.count}`).join(', ');
    issues.push(`${context.leads.unassigned} leads are unassigned${stateDetails ? ` (${stateDetails})` : ''}. Add buyer coverage or adjust caps.`);
  }

  return {
    analysis: issues.length > 0
      ? `## Failure Analysis\n\n${issues.join('\n\n')}`
      : '## System Health\n\nNo significant failures detected. All systems operating normally.',
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    context: {
      failedDeliveries: context.delivery.failed,
      failedIngestion: context.leads.failedIngestion,
      unassignedLeads: context.leads.unassigned,
      timestamp: new Date().toISOString()
    }
  };
}

module.exports = {
  generateCapRecommendations,
  generateRoutingRecommendations,
  generateFailureAnalysis,
  generateSystemDiagnostic,
  generateSourceQualityReport
};
