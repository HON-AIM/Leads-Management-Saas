const { runPipeline } = require('../pipeline');
const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');
const Supplier = require('../models/Supplier');
const logger = require('../utils/logger');

async function processLead(data) {
  const { leadId, campaignId, tenantId } = data;

  const [lead, campaign] = await Promise.all([
    Lead.findById(leadId),
    Campaign.findById(campaignId),
  ]);

  if (!lead) throw new Error(`Lead ${leadId} not found`);
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

  // Layer 2: Hard stop — duplicate leads must never enter the pipeline
  if (lead.isDuplicate || lead.status === 'duplicate') {
    logger.info('Lead processor skipped duplicate lead', { leadId, duplicateOf: lead.duplicateOf });
    return { leadId, status: 'duplicate', reason: 'Duplicate lead — processing skipped' };
  }

  let supplier = null;
  if (lead.supplierId) {
    supplier = await Supplier.findById(lead.supplierId);
  }

  const ctx = await runPipeline({ lead, campaign, supplier, tenantId });

  if (ctx.error) {
    logger.error('Pipeline error during lead processing', {
      leadId,
      error: ctx.error.message,
      stopReason: ctx.stopReason,
    });
    await Lead.findByIdAndUpdate(leadId, { status: 'failed' });
    return { leadId, status: 'failed', error: ctx.error.message };
  }

  if (!ctx.assignment) {
    if (lead.status === 'new') {
      await Lead.findByIdAndUpdate(leadId, { status: 'unassigned' });
    }
    return { leadId, status: lead.status, reason: ctx.stopReason };
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
