const { scoreLead } = require('../../services/leadScoringService');
const logger = require('../../utils/logger');

async function scoring(ctx) {
  const { lead, campaign } = ctx;

  if (!campaign) return;

  try {
    const result = await scoreLead(lead, campaign);
    lead.score = result.score;
    lead.scoreReasoning = result.reasoning;
    lead.scoredAt = new Date();
    await lead.save();
  } catch (err) {
    logger.error(`Scoring stage failed for lead ${lead._id}: ${err.message}`);
    lead.score = null;
    lead.scoreReasoning = 'Scoring unavailable';
  }
}

module.exports = scoring;
