const { z } = require('zod');

const MAX_PAYLOAD_SIZE = 50000;
const MAX_STRING_LENGTH = 2000;

const trackingMetadataSchema = z.object({
  utmSource: z.string().max(500).optional(),
  utmMedium: z.string().max(500).optional(),
  utmCampaign: z.string().max(500).optional(),
  utmTerm: z.string().max(500).optional(),
  utmContent: z.string().max(500).optional(),
  fbclid: z.string().max(500).optional(),
  gclid: z.string().max(500).optional(),
  referrer: z.string().max(2000).optional(),
  landingPage: z.string().max(2000).optional(),
  userAgent: z.string().max(500).optional(),
  ipAddress: z.string().max(100).optional(),
  pageUrl: z.string().max(2000).optional(),
  formId: z.string().max(200).optional(),
  adId: z.string().max(200).optional(),
  adSetId: z.string().max(200).optional(),
  campaignId: z.string().max(200).optional(),
}).optional();

const metadataSchema = z.record(z.unknown()).optional();

const baseLeadFields = {
  name: z.string().min(1).max(MAX_STRING_LENGTH),
  email: z.string().email().max(320),
  phone: z.string().min(5).max(30),
  state: z.string().min(2).max(100),
  source: z.enum(['facebook', 'ghl', 'lovable', 'api', 'webhook', 'form']).default('api'),
  campaign: z.string().max(500).optional(),
  notes: z.string().max(MAX_STRING_LENGTH).optional(),
  tracking: trackingMetadataSchema,
  metadata: metadataSchema,
};

const ingestBodySchema = z.object(baseLeadFields).strict();

const flexibleIngestSchema = z.object({
  name: z.string().min(1).max(MAX_STRING_LENGTH).optional(),
  full_name: z.string().min(1).max(MAX_STRING_LENGTH).optional(),
  firstName: z.string().max(MAX_STRING_LENGTH).optional(),
  lastName: z.string().max(MAX_STRING_LENGTH).optional(),
  first_name: z.string().max(MAX_STRING_LENGTH).optional(),
  last_name: z.string().max(MAX_STRING_LENGTH).optional(),
  contact_name: z.string().max(MAX_STRING_LENGTH).optional(),

  email: z.string().email().max(320).optional(),
  email_address: z.string().email().max(320).optional(),

  phone: z.string().max(30).optional(),
  phone_number: z.string().max(30).optional(),

  state: z.string().max(100).optional(),
  state_province: z.string().max(100).optional(),
  location_state: z.string().max(100).optional(),
  'location.state': z.string().max(100).optional(),
  'address.state': z.string().max(100).optional(),

  source: z.enum(['facebook', 'ghl', 'lovable', 'api', 'webhook', 'form']),
  campaign: z.string().max(500).optional(),
  notes: z.string().max(MAX_STRING_LENGTH).optional(),
  tracking: trackingMetadataSchema,
  metadata: metadataSchema,
  tenantId: z.string().max(100).optional(),
}).passthrough().refine(
  (data) => {
    const payloadSize = JSON.stringify(data).length;
    return payloadSize <= MAX_PAYLOAD_SIZE;
  },
  { message: `Payload exceeds ${MAX_PAYLOAD_SIZE} bytes` }
);

const facebookLeadSchema = z.object({
  fieldData: z.object({
    name: z.string().optional(),
    full_name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    phone_number: z.string().optional(),
    phone: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    zip_code: z.string().optional(),
    ad_id: z.string().optional(),
    ad_name: z.string().optional(),
    adset_id: z.string().optional(),
    adset_name: z.string().optional(),
    campaign_id: z.string().optional(),
    campaign_name: z.string().optional(),
    form_id: z.string().optional(),
    page_id: z.string().optional(),
  }).optional(),
  leadgen_id: z.string().optional(),
  created_time: z.string().optional(),
  page_id: z.string().optional(),
  form_id: z.string().optional(),
  adgroup_id: z.string().optional(),
  ad_id: z.string().optional(),
  campaign_id: z.string().optional(),
}).passthrough();

const ghlLeadSchema = z.object({
  contact: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    state: z.string().optional(),
    source: z.string().optional(),
    tags: z.array(z.string()).optional(),
    customFields: z.array(z.object({
      key: z.string(),
      value: z.unknown(),
    })).optional(),
  }).optional(),
  locationId: z.string().optional(),
  source: z.string().optional(),
}).passthrough();

const lovableLeadSchema = z.object({
  contactName: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  contactState: z.string().optional(),
  message: z.string().optional(),
  projectType: z.string().optional(),
  budget: z.string().optional(),
  timeline: z.string().optional(),
}).passthrough();

function detectSource(body) {
  if (body.fieldData || body.leadgen_id) return 'facebook';
  if (body.contact || body.locationId) return 'ghl';
  if (body.contactName || body.projectType) return 'lovable';
  return null;
}

function extractFromSource(body, source) {
  switch (source) {
    case 'facebook': {
      const fd = body.fieldData || body;
      return {
        name: fd.full_name || fd.name || `${fd.first_name || ''} ${fd.last_name || ''}`.trim() || undefined,
        email: fd.email || undefined,
        phone: fd.phone_number || fd.phone || undefined,
        state: fd.state || undefined,
        campaign: fd.campaign_name || undefined,
        tracking: {
          formId: fd.form_id || body.form_id,
          adId: fd.ad_id || body.ad_id || fd.ad_name,
          adSetId: fd.adset_id || body.adgroup_id || fd.adset_name,
          campaignId: fd.campaign_id || body.campaign_id || fd.campaign_name,
        },
      };
    }
    case 'ghl': {
      const c = body.contact || body;
      return {
        name: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || undefined,
        email: c.email || undefined,
        phone: c.phone || undefined,
        state: c.state || undefined,
        source: body.source || 'ghl',
        campaign: undefined,
      };
    }
    case 'lovable': {
      return {
        name: body.contactName || undefined,
        email: body.contactEmail || undefined,
        phone: body.contactPhone || undefined,
        state: body.contactState || undefined,
        notes: body.message || undefined,
        metadata: {
          projectType: body.projectType,
          budget: body.budget,
          timeline: body.timeline,
        },
      };
    }
    default:
      return {};
  }
}

module.exports = {
  ingestBodySchema,
  flexibleIngestSchema,
  facebookLeadSchema,
  ghlLeadSchema,
  lovableLeadSchema,
  trackingMetadataSchema,
  detectSource,
  extractFromSource,
};
