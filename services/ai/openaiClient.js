const OpenAI = require('openai');

let client = null;

const MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS) || 2048;
const TEMPERATURE = parseFloat(process.env.AI_TEMPERATURE) || 0.3;

function getClient() {
  if (client) return client;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[OpenAI] No API key configured. Using mock mode.');
    return null;
  }

  client = new OpenAI({ apiKey });
  return client;
}

async function chat(messages, options = {}) {
  const openai = getClient();

  if (!openai) {
    return mockChat(messages, options);
  }

  const model = options.model || MODEL;
  const maxTokens = options.maxTokens || MAX_TOKENS;
  const temperature = options.temperature ?? TEMPERATURE;

  try {
    const response = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      ...options.params
    });

    const choice = response.choices[0];

    return {
      content: choice.message.content,
      role: choice.message.role,
      finishReason: choice.finish_reason,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      },
      model: response.model
    };
  } catch (error) {
    console.error('[OpenAI] API call failed:', error.message);
    throw new Error(`AI request failed: ${error.message}`);
  }
}

async function mockChat(messages, options = {}) {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const question = lastUserMsg?.content?.toLowerCase() || '';

  let response = '';

  if (question.includes('cap') || question.includes('capacity')) {
    response = `## Cap Analysis\n\nBased on the current system data, here's the cap utilization analysis:\n\n- **Lifetime caps**: Most buyers are within their lifetime lead limits. I recommend reviewing buyers approaching 80%+ utilization.\n- **Daily caps**: Some buyers may hit daily limits during peak hours. Consider increasing daily caps for high-performing buyers.\n- **Monthly caps**: Track monthly trends to avoid late-month routing bottlenecks.\n\n### Recommendation\nReview and adjust caps for buyers consistently hitting >80% utilization. Consider setting higher caps for top performers.`;
  } else if (question.includes('routing') || question.includes('imbalance') || question.includes('distribution')) {
    response = `## Routing Analysis\n\nExamining the current routing state across states and modes:\n\n- **Round-robin distribution**: Leads are being evenly distributed among eligible buyers in most states.\n- **Priority routing**: Priority-based routing is functioning as configured.\n- **State coverage**: Some states have limited buyer coverage, which may cause unassigned leads.\n\n### Recommendation\nConsider adding more buyers in underserved states or configuring fallback groups for better geographic coverage.`;
  } else if (question.includes('fail') || question.includes('error') || question.includes('issue')) {
    response = `## Failed Lead Analysis\n\nAnalyzing recent delivery failures:\n\n- **Delivery failures**: Most failures are due to provider-side issues rather than system errors.\n- **Routing failures**: Unassigned leads are primarily caused by capacity limits in certain states.\n- **Ingestion failures**: Data quality issues (invalid state, missing fields) cause a small percentage of failures.\n\n### Recommendation\nEnable retry mechanisms for transient delivery failures. Review data quality at ingestion points.`;
  } else if (question.includes('source') || question.includes('quality')) {
    response = `## Source Quality Insights\n\nEvaluating lead source performance:\n\n- **Webhook sources**: Converting well with good data quality.\n- **Form submissions**: High volume but some incomplete submissions.\n- **Facebook leads**: Good volume but higher duplicate rates.\n\n### Recommendation\nImprove form validation to reduce incomplete submissions. Implement better dedup for Facebook leads.`;
  } else if (question.includes('buyer') || question.includes('most')) {
    response = `## Buyer Performance Summary\n\nLead distribution across buyers:\n\n- **Top performers**: A few buyers consistently receive the most leads due to state coverage and routing configuration.\n- **Underutilized**: Some buyers have remaining capacity but limited state matching.\n- **Paused buyers**: Several buyers are currently paused, reducing available routing options.\n\n### Recommendation\nReview paused buyers and consider reactivating if capacity is needed. Adjust routing configurations to balance load.`;
  } else {
    response = `## System Overview\n\nThe Lead Distribution SaaS is operating normally.\n\n**Key Metrics:** Active buyers are processing leads across multiple states with standard round-robin and priority-based routing. The system has automated cap management and delivery tracking in place.\n\n**Areas I can help with:**\n1. Cap analysis and recommendations\n2. Routing imbalance detection\n3. Failed lead diagnosis\n4. Source quality insights\n5. Buyer performance summaries\n\nWhat specific area would you like me to analyze?`;
  }

  return {
    content: response,
    role: 'assistant',
    finishReason: 'stop',
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    model: 'mock'
  };
}

async function generateStreamingChat(messages, options = {}) {
  const openai = getClient();

  if (!openai) {
    const result = await mockChat(messages, options);
    return {
      async *[Symbol.asyncIterator]() {
        yield { content: result.content, done: true };
      }
    };
  }

  const model = options.model || MODEL;
  const maxTokens = options.maxTokens || MAX_TOKENS;
  const temperature = options.temperature ?? TEMPERATURE;

  const stream = await openai.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
    stream: true,
    ...options.params
  });

  return stream;
}

module.exports = {
  chat,
  generateStreamingChat,
  getClient,
  MODEL,
  MAX_TOKENS,
  TEMPERATURE
};
