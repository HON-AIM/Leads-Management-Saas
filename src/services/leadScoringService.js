const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');

async function scoreLead(lead, campaign) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      logger.warn('Lead scoring skipped: ANTHROPIC_API_KEY not set');
      return { score: null, reasoning: 'Scoring unavailable — API key not configured' };
    }

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Score this lead's quality from 0-100 based on likely buyer conversion. Consider: completeness of information, plausibility of contact details, and any qualifying answers provided. Campaign: ${campaign.name}. Lead data: ${JSON.stringify(lead.rawPayload || lead)}. Respond with ONLY valid JSON: {"score": <0-100>, "reasoning": "<one sentence>"}`,
      }],
    });
    const parsed = JSON.parse(response.content[0].text);
    return {
      score: Math.max(0, Math.min(100, parsed.score)),
      reasoning: parsed.reasoning || '',
    };
  } catch (err) {
    logger.error(`Lead scoring failed for lead ${lead._id}: ${err.message}`);
    return { score: null, reasoning: 'Scoring unavailable' };
  }
}

module.exports = { scoreLead };
