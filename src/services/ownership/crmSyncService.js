const CrmSyncLog = require('../../../models/CrmSyncLog');
const Lead = require('../../../models/Lead');
const metadataBuilder = require('./metadataBuilder');
const routingHistoryService = require('./routingHistoryService');
const { getLogger } = require('../../utils/logger');

const logger = getLogger('CrmSyncService');

class CrmSyncService {
  static async syncLeadToCrm(leadId, { platform, syncType, tenantId, buyerId = null, webhookUrl = null, ghlApiKey = null, maxRetries = 3 }) {
    const lead = await Lead.findById(leadId).lean();
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    const payload = metadataBuilder.buildOutboundPayload(lead, { platform });
    const startTime = Date.now();

    const syncLog = await CrmSyncLog.create({
      leadId,
      tenantId,
      buyerId: buyerId || lead.assignedBuyerId,
      platform,
      syncType,
      requestPayload: payload,
      retryCount: 0,
      maxRetries,
    });

    let success = false;
    let responsePayload = null;
    let errorMessage = null;
    let errorCode = null;
    let statusCode = null;

    try {
      const result = await this._executeSync(platform, payload, { webhookUrl, ghlApiKey, syncType });
      success = true;
      responsePayload = result.data;
      statusCode = result.status;

      const externalId = result.externalId || result.data?.contact?.id || result.data?.id || null;

      const externalUpdate = {};
      if (platform === 'GHL') {
        if (syncType.includes('contact')) externalUpdate['externalReferences.ghlContactId'] = externalId;
        if (syncType.includes('opportunity')) externalUpdate['externalReferences.ghlOpportunityId'] = externalId;
      } else if (platform === 'facebook') {
        externalUpdate['externalReferences.facebookLeadId'] = externalId;
      } else {
        externalUpdate['externalReferences.externalCRMLeadId'] = externalId;
      }
      if (externalId || Object.keys(externalUpdate).length) {
        await Lead.findByIdAndUpdate(leadId, {
          ...externalUpdate,
          'deliveryMetadata.lastSyncStatus': 'synced',
          'deliveryMetadata.lastSyncAt': new Date(),
        });
      }

      await routingHistoryService.recordRoutingEvent({
        leadId,
        eventType: 'crm_synced',
        toBuyerId: lead.assignedBuyerId,
        toBuyerName: lead.assignedBuyerName,
        sourcePlatform: lead.sourcePlatform || 'form',
        destinationPlatform: platform,
        campaignId: lead.campaign,
        performedBy: 'system',
        tenantId,
        systemNotes: `CRM sync succeeded via ${platform}`,
      });

      logger.info(`CRM sync succeeded for lead ${leadId} via ${platform}`, { leadId, platform, externalId });
    } catch (err) {
      success = false;
      errorMessage = err.message;
      errorCode = err.code || 'SYNC_ERROR';
      statusCode = err.status || 500;

      await Lead.findByIdAndUpdate(leadId, {
        'deliveryMetadata.lastSyncStatus': 'failed',
        'deliveryMetadata.lastSyncAt': new Date(),
      });

      if (syncLog.retryCount < maxRetries) {
        const nextRetry = new Date(Date.now() + Math.pow(2, syncLog.retryCount) * 60000);
        await CrmSyncLog.findByIdAndUpdate(syncLog._id, { nextRetryAt: nextRetry });

        logger.warn(`CRM sync failed for lead ${leadId}, will retry at ${nextRetry}`, { leadId, platform, error: err.message });
      }

      logger.error(`CRM sync failed for lead ${leadId} via ${platform}`, { leadId, platform, error: err.message });
    }

    await CrmSyncLog.findByIdAndUpdate(syncLog._id, {
      responsePayload,
      success,
      errorMessage,
      errorCode,
      statusCode,
      duration: Date.now() - startTime,
      syncedAt: success ? new Date() : undefined,
    });

    return { success, syncLogId: syncLog._id, externalId: responsePayload?.id || null };
  }

  static async getSyncStatus(leadId, { platform = null, limit = 10 } = {}) {
    const filter = { leadId };
    if (platform) filter.platform = platform;
    return CrmSyncLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  static async retryFailedSync(syncLogId) {
    const syncLog = await CrmSyncLog.findById(syncLogId);
    if (!syncLog) throw new Error(`Sync log ${syncLogId} not found`);
    if (syncLog.success) throw new Error(`Sync log ${syncLogId} already succeeded`);

    const updated = await CrmSyncLog.findByIdAndUpdate(syncLogId, {
      $inc: { retryCount: 1 },
      nextRetryAt: null,
    }, { new: true });

    return this.syncLeadToCrm(syncLog.leadId, {
      platform: syncLog.platform,
      syncType: syncLog.syncType,
      tenantId: syncLog.tenantId,
      buyerId: syncLog.buyerId,
      maxRetries: syncLog.maxRetries,
    });
  }

  static async syncPlatform(leadId, platform, payload, tenantId, { ghlApiKey = null, webhookUrl = null } = {}) {
    const lead = await Lead.findById(leadId).lean();
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    const startTime = Date.now();
    let success = false;
    let responsePayload = null;
    let errorMessage = null;
    let statusCode = null;

    const syncLog = await CrmSyncLog.create({
      leadId,
      tenantId,
      buyerId: lead.assignedBuyerId,
      platform,
      syncType: 'push_to_api',
      requestPayload: payload,
    });

    try {
      const result = await this._executeSync(platform, payload, { webhookUrl, ghlApiKey });
      success = true;
      responsePayload = result.data;
      statusCode = result.status;

      await Lead.findByIdAndUpdate(leadId, {
        'deliveryMetadata.lastSyncStatus': 'synced',
        'deliveryMetadata.lastSyncAt': new Date(),
      });

      logger.info(`Platform sync succeeded for lead ${leadId} via ${platform}`);
    } catch (err) {
      success = false;
      errorMessage = err.message;
      statusCode = err.status || 500;

      await Lead.findByIdAndUpdate(leadId, {
        'deliveryMetadata.lastSyncStatus': 'failed',
        'deliveryMetadata.lastSyncAt': new Date(),
      });

      logger.error(`Platform sync failed for lead ${leadId} via ${platform}`, { error: err.message });
    }

    await CrmSyncLog.findByIdAndUpdate(syncLog._id, {
      responsePayload,
      success,
      errorMessage,
      statusCode,
      duration: Date.now() - startTime,
      syncedAt: success ? new Date() : undefined,
    });

    return { success, syncLogId: syncLog._id };
  }

  static async _executeSync(platform, payload, { webhookUrl = null, ghlApiKey = null, syncType = 'create_contact' } = {}) {
    const axios = require('axios');

    switch (platform) {
      case 'GHL': {
        if (!ghlApiKey) throw Object.assign(new Error('GHL API key not configured'), { code: 'MISSING_CONFIG', status: 400 });
        const contactId = payload.id || null;
        if (syncType === 'update_contact' && contactId) {
          const response = await axios.put(`https://rest.gohighlevel.com/v1/contacts/${contactId}`, payload, {
            headers: { Authorization: `Bearer ${ghlApiKey}`, 'Content-Type': 'application/json' },
            timeout: 15000,
          });
          return { status: response.status, data: response.data, externalId: contactId };
        }

        const response = await axios.post('https://rest.gohighlevel.com/v1/contacts/', payload, {
          headers: { Authorization: `Bearer ${ghlApiKey}`, 'Content-Type': 'application/json' },
          timeout: 15000,
        });
        return { status: response.status, data: response.data, externalId: response.data?.contact?.id || response.data?.id || null };
      }

      case 'webhook': {
        if (!webhookUrl) throw Object.assign(new Error('Webhook URL not configured'), { code: 'MISSING_CONFIG', status: 400 });
        const response = await axios.post(webhookUrl, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        });
        return { status: response.status, data: response.data };
      }

      default:
        throw Object.assign(new Error(`Unsupported platform: ${platform}`), { code: 'UNSUPPORTED_PLATFORM', status: 400 });
    }
  }
}

module.exports = CrmSyncService;
