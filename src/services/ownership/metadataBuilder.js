class MetadataBuilder {
  static buildOutboundPayload(lead, { platform = 'GHL' } = {}) {
    const nameParts = this._splitName(lead.name || 'Unknown');
    const base = {
      first_name: nameParts.first_name,
      last_name: nameParts.last_name,
      email: lead.email,
      phone: lead.phone || '',
      source: lead.source || 'form',
    };

    if (platform === 'GHL') {
      return this._buildGhlPayload(lead, base);
    }

    return base;
  }

  static _buildRoutingMetadata(lead) {
    return {
      internal_lead_id: lead._id ? lead._id.toString() : null,
      buyer_id: lead.assignedBuyerId ? lead.assignedBuyerId.toString() : null,
      buyer_name: lead.assignedBuyerName || null,
      routing_method: lead.routingMethod || 'round_robin',
      routing_priority: lead.routingPriority || 0,
      campaign_id: lead.campaign || null,
      source_platform: lead.sourcePlatform || lead.source || 'form',
      destination_platform: lead.destinationPlatform || null,
      routing_version: lead.routingVersion || null,
      assignment_status: lead.assignmentStatus || 'pending',
      external_references: {
        facebookLeadId: lead.externalReferences?.facebookLeadId || null,
        ghlContactId: lead.externalReferences?.ghlContactId || null,
        ghlOpportunityId: lead.externalReferences?.ghlOpportunityId || null,
        externalCRMLeadId: lead.externalReferences?.externalCRMLeadId || null,
      },
    };
  }

  static _splitName(name) {
    if (!name || typeof name !== 'string') {
      return { first_name: 'Unknown', last_name: '' };
    }

    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return { first_name: parts[0], last_name: '' };
    }

    return {
      first_name: parts[0],
      last_name: parts.slice(1).join(' '),
    };
  }

  static _buildGhlPayload(lead, base) {
    const payload = {
      ...base,
      agent: lead.assignedBuyerGhlUserId || undefined,
      routing_metadata: this._buildRoutingMetadata(lead),
      customField: [],
    };

    const customFields = [];

    if (lead.normalized_country_code) {
      customFields.push({ key: 'country_code', value: lead.normalized_country_code });
    }
    if (lead.normalized_region_code) {
      customFields.push({ key: 'region_code', value: lead.normalized_region_code });
    }
    if (lead.normalized_city) {
      customFields.push({ key: 'city', value: lead.normalized_city });
    }
    if (lead.campaign) {
      customFields.push({ key: 'campaign', value: lead.campaign });
    }
    if (lead.state) {
      customFields.push({ key: 'state', value: lead.state });
    }

    if (lead.externalReferences?.ghlContactId) {
      payload.id = lead.externalReferences.ghlContactId;
    }

    if (lead.externalReferences?.ghlOpportunityId) {
      payload.opportunity_id = lead.externalReferences.ghlOpportunityId;
    }

    payload.customField = customFields;
    return payload;
  }
}

module.exports = MetadataBuilder;
