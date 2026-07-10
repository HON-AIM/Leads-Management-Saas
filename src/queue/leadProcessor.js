const { runPipeline } = require('../pipeline');
const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');
const logger = require('../utils/logger');

async function processLead(data) {
  const { leadId, campaignId, tenantId } = data;

  const [lead, campaign] = await Promise.all([
    Lead.findById(leadId),
    Campaign.findById(campaignId),
  ]);

  if (!lead) throw new Error('Lead not found');
  if (!campaign) throw new Error('Campaign not found');

  const ctx = await runPipeline({ lead, campaign, tenantId });

  if (!ctx.assignment) {
    lead.status = 'unassigned';
    await lead.save();
    return { status: 'unassigned', leadId };
  }

  return {
    leadId,
    assignmentId: ctx.assignment._id,
    buyerId: ctx.selectedBuyer?.buyer?._id,
    buyerName: ctx.selectedBuyer?.buyer?.name,
    delivered: ctx.deliveryResult?.success || false,
    method: ctx.deliveryResult?.method || 'webhook',
  };
}

module.exports = { processLead };
