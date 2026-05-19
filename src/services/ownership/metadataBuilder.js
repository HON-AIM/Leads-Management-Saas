class MetadataBuilder {
  static buildOutboundPayload(lead, { platform = 'GHL' } = {}) {
    const base = {
      name: lead.name,
      email: lead.email,
      phone: lead.phone || '',
      source: lead.source || 'form',
    };

    if (platform === 'GHL') {
      return this._buildGhlPayload(lead, base);
    }

    return base;
  }

  static injectOwnershipMetadata(payload, lead) {
    return {
      ...payload,
      assignedBuyerId: lead.assignedBuyerId ? lead.assignedBuyerId.toString() : null,
      assignedBuyerName: lead.assignedBuyerName || null,
      assignedBuyerEmail: lead.assignedBuyerEmail || null,
      assignmentStatus: lead.assignmentStatus || 'unassigned',
      assignedAt: lead.assignedAt || null,
      ownershipLocked: lead.ownershipMetadata?.ownershipLocked || false,
      originalOwnerId: lead.ownershipMetadata?.originalOwnerId ? lead.ownershipMetadata.originalOwnerId.toString() : null,
    };
  }

  static injectAuditReferences(payload, { routingHistoryId = null, ownershipAuditId = null, crmSyncLogId = null }) {
    return {
      ...payload,
      _audit: {
        routingHistoryId: routingHistoryId?.toString() || null,
        ownershipAuditId: ownershipAuditId?.toString() || null,
        crmSyncLogId: crmSyncLogId?.toString() || null,
      },
    };
  }

  static _buildGhlPayload(lead, base) {
    const ghlContact = {
      ...base,
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

    const ownershipMeta = this.injectOwnershipMetadata({}, lead);
    Object.entries(ownershipMeta).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        customFields.push({ key: `lead_${key}`, value: String(value) });
      }
    });

    if (lead.externalReferences?.ghlContactId) {
      ghlContact.id = lead.externalReferences.ghlContactId;
    }

    ghlContact.customField = customFields;
    return ghlContact;
  }
}

module.exports = MetadataBuilder;
