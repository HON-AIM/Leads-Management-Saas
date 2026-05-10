const SYSTEM_PROMPT = `You are an AI Operations Assistant for a Lead Distribution SaaS platform. Your role is to help administrators understand and optimize their lead distribution operations.

CAPABILITIES:
1. Analyze lead routing and distribution patterns
2. Diagnose failed leads and delivery issues
3. Monitor buyer capacity utilization
4. Detect routing imbalances across states
5. Evaluate lead source quality and performance
6. Provide actionable recommendations

ANALYSIS GUIDELINES:
- Always cite specific numbers and data when making observations
- Distinguish between configuration issues (routing, caps) and operational issues (delivery failures, data quality)
- Consider time-based patterns (daily caps, monthly trends, schedule constraints)
- Note when buyers are paused or inactive
- Flag states with insufficient buyer coverage
- Compare source performance for quality insights

RECOMMENDATION GUIDELINES:
- Provide specific, actionable recommendations
- Prioritize by impact (high/medium/low)
- Include both short-term fixes and long-term improvements
- Consider the tenant's plan limitations when suggesting features
- Suggest cap adjustments based on utilization patterns

OUTPUT FORMAT:
- Use markdown for readability
- Start each analysis section with a clear heading
- Use bullet points for findings
- Highlight critical issues with bold text
- End with a summary of recommended actions

RESPONSE CONSTRAINTS:
- Be concise but thorough
- If you don't have enough data to answer confidently, say so
- Never make up data that wasn't provided in the context
- Keep responses focused on operational and analytics insights`;

const QUERY_CLASSIFIER_PROMPT = `Classify the user's question into one of these categories:

- cap_analysis: Questions about buyer capacity, lead caps, utilization rates, cap recommendations
- routing_analysis: Questions about lead routing, distribution imbalance, round-robin state, routing modes
- failure_analysis: Questions about failed leads, delivery errors, ingestion issues, unassigned leads
- source_quality: Questions about lead source performance, quality metrics, source comparison
- buyer_performance: Questions about buyer activity, who received the most leads, buyer comparisons
- general_overview: General questions about system health, summary, what's happening
- diagnostic: Questions about system issues, problems, alerts, what needs attention
- recommendation: Questions asking for advice, suggestions, improvements

Respond with ONLY the category name.`;

const CAP_RECOMMENDATION_PROMPT = `Based on the current buyer capacity data, provide specific recommendations for cap adjustments.

For each buyer approaching capacity limits, suggest:
1. Whether to increase caps (and by how much)
2. Whether to redistribute leads to underutilized buyers
3. If daily/monthly caps should be adjusted

Consider the tenant's overall lead volume trends when making suggestions.`;

const ROUTING_ANALYSIS_PROMPT = `Analyze the routing configuration and identify:
1. States with insufficient buyer coverage
2. Round-robin distribution balance
3. Priority/weighted routing effectiveness
4. Fallback group utilization
5. Paused buyer impact on routing

Provide specific recommendations to improve routing balance.`;

const FAILURE_ANALYSIS_PROMPT = `Analyze the recent lead and delivery failures to determine root causes:
1. Are failures concentrated in specific states?
2. Are specific buyers experiencing more failures?
3. Are failures provider-related or data-related?
4. Are unassigned leads due to capacity or coverage gaps?

Distinguish between systemic issues and transient errors.`;

function buildContextPrompt(context) {
  return `## Current System State (as of ${new Date().toISOString()})

### System Overview
- Tenant: ${context.system.name}
- Plan: ${context.system.plan}
- Status: ${context.system.status}
- Active Users: ${context.system.activeUsers}

### Lead Statistics
- Total Leads: ${context.leads.total}
- Assigned: ${context.leads.assigned} (${context.leads.assignmentRate}%)
- Unassigned: ${context.leads.unassigned}
- Pending: ${context.leads.pending}
- Today: ${context.leads.today}
- This Week: ${context.leads.thisWeek}
- This Month: ${context.leads.thisMonth}
- Failed Ingestion: ${context.leads.failedIngestion}

### Client Statistics
- Total Buyers: ${context.clients.total}
- Active: ${context.clients.active}
- Paused: ${context.clients.paused}
- Full: ${context.clients.full}
- Inactive: ${context.clients.inactive}
- At Cap: ${context.clients.capExhausted}

### Delivery Performance
- Total Attempts: ${context.delivery.total}
- Successful: ${context.delivery.success}
- Failed: ${context.delivery.failed}
- Retrying: ${context.delivery.retrying}
- Success Rate: ${context.delivery.successRate}%

${context.delivery.recentFailures.length > 0 ? `### Recent Delivery Failures\n${context.delivery.recentFailures.map(f =>
  `- Lead: ${f.lead?.name || 'Unknown'} (${f.lead?.state || 'N/A'}) → ${f.buyer}: ${f.error}`
).join('\n')}` : ''}

### Routing State
- States with Routing: ${context.routing.stateCount}
- Unassigned Leads: ${context.routing.unassignedLeads.total}
${context.routing.unassignedLeads.byState.length > 0 ? `- Unassigned by State: ${context.routing.unassignedLeads.byState.map(s => `${s.state}: ${s.count}`).join(', ')}` : ''}

### Buyer Capacity Summary
${context.buyers.map(b =>
  `- ${b.name} (${b.state}, ${b.routingMode}): Lifetime ${b.caps.lifetime.utilization}%${b.caps.lifetime.utilization !== 'unlimited' ? ` (${b.caps.lifetime.used}/${b.caps.lifetime.cap})` : ''}, Daily ${b.caps.daily.utilization}%, Monthly ${b.caps.monthly.utilization}% | Status: ${b.status}`
).join('\n')}

### Lead Source Breakdown
${context.sources.map(s =>
  `- ${s.source}: ${s.count} leads (${s.percentage}%), Assignment Rate: ${s.assignmentRate}%, Failed: ${s.failed}, Duplicates: ${s.duplicate}`
).join('\n')}

### Recent Activity
${context.recentActivity.map(a =>
  `- [${a.type}] ${a.message}`
).join('\n')}

### Recent Leads (Last 10)
${context.recentLeads.map(l =>
  `- ${l.name} | ${l.email} | ${l.state} | Source: ${l.source} | Status: ${l.status} | Ingestion: ${l.ingestionStatus}`
).join('\n')}`;
}

function buildFollowupContext(context) {
  const buyers = context.buyers;
  const totalLifetimeCap = buyers.reduce((sum, b) => {
    return b.caps.lifetime.cap > 0 ? sum + b.caps.lifetime.cap : sum;
  }, 0);
  const totalLifetimeUsed = buyers.reduce((sum, b) => sum + b.caps.lifetime.used, 0);

  return `Updated KPIs:
- Leads Today: ${context.leads.today} | This Week: ${context.leads.thisWeek} | This Month: ${context.leads.thisMonth}
- Unassigned: ${context.leads.unassigned} | Failed: ${context.leads.failedIngestion}
- Active Buyers: ${context.clients.active} of ${context.clients.total}
- Delivery Success Rate: ${context.delivery.successRate}%
- Total Capacity Used: ${totalLifetimeUsed}/${totalLifetimeCap || 'unlimited'}
- Sources: ${context.sources.map(s => `${s.source} (${s.count})`).join(', ')}`;
}

module.exports = {
  SYSTEM_PROMPT,
  QUERY_CLASSIFIER_PROMPT,
  CAP_RECOMMENDATION_PROMPT,
  ROUTING_ANALYSIS_PROMPT,
  FAILURE_ANALYSIS_PROMPT,
  buildContextPrompt,
  buildFollowupContext
};
