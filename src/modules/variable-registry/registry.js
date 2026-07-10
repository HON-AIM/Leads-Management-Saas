const CATEGORIES = {
  LEAD: 'Lead',
  BUYER: 'Buyer',
  CAMPAIGN: 'Campaign',
  ASSIGNMENT: 'Assignment',
  SYSTEM: 'System',
  FUTURE: 'Future',
  AGENCY: 'Agency',
  TENANT: 'Tenant',
  PIPELINE: 'Pipeline',
  OPPORTUNITY: 'Opportunity',
  TAGS: 'Tags',
  CUSTOM_FIELDS: 'Custom Fields',
}

const TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  DATE: 'date',
  ARRAY: 'array',
  OBJECT: 'object',
}

const VARIABLES = [
  // ── Lead ──────────────────────────────────────────────
  { key: 'lead.id', label: 'Lead ID', category: CATEGORIES.LEAD, type: TYPES.STRING, description: 'Unique lead identifier', example: 'ld_a1b2c3d4', path: 'lead.id', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'lead.firstName', label: 'Lead First Name', category: CATEGORIES.LEAD, type: TYPES.STRING, description: 'Customer first name', example: 'John', path: 'lead.firstName', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'lead.lastName', label: 'Lead Last Name', category: CATEGORIES.LEAD, type: TYPES.STRING, description: 'Customer last name', example: 'Smith', path: 'lead.lastName', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'lead.fullName', label: 'Lead Full Name', category: CATEGORIES.LEAD, type: TYPES.STRING, description: 'Customer full name', example: 'John Smith', path: 'lead.fullName', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'lead.email', label: 'Lead Email', category: CATEGORIES.LEAD, type: TYPES.STRING, description: 'Customer email address', example: 'john@example.com', path: 'lead.email', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'lead.phone', label: 'Lead Phone', category: CATEGORIES.LEAD, type: TYPES.STRING, description: 'Customer phone number', example: '+14085551234', path: 'lead.phone', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'lead.country', label: 'Lead Country', category: CATEGORIES.LEAD, type: TYPES.STRING, description: 'Customer country name', example: 'United States', path: 'lead.country', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'lead.countryCode', label: 'Lead Country Code', category: CATEGORIES.LEAD, type: TYPES.STRING, description: 'Customer country ISO code', example: 'US', path: 'lead.countryCode', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'lead.state', label: 'Lead State', category: CATEGORIES.LEAD, type: TYPES.STRING, description: 'Customer state name', example: 'California', path: 'lead.state', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'lead.stateCode', label: 'Lead State Code', category: CATEGORIES.LEAD, type: TYPES.STRING, description: 'Customer state abbreviation', example: 'CA', path: 'lead.stateCode', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'lead.city', label: 'Lead City', category: CATEGORIES.LEAD, type: TYPES.STRING, description: 'Customer city', example: 'San Francisco', path: 'lead.city', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'lead.postalCode', label: 'Lead Postal Code', category: CATEGORIES.LEAD, type: TYPES.STRING, description: 'Customer postal/ZIP code', example: '94102', path: 'lead.postalCode', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'lead.address', label: 'Lead Address', category: CATEGORIES.LEAD, type: TYPES.STRING, description: 'Customer full address', example: '123 Main St, San Francisco, CA 94102', path: 'lead.address', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'lead.source', label: 'Lead Source', category: CATEGORIES.LEAD, type: TYPES.STRING, description: 'Where the lead came from', example: 'facebook', path: 'lead.source', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'lead.createdAt', label: 'Lead Created At', category: CATEGORIES.LEAD, type: TYPES.DATE, description: 'When the lead was created', example: '2026-07-10T14:30:00.000Z', path: 'lead.createdAt', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'lead.receivedAt', label: 'Lead Received At', category: CATEGORIES.LEAD, type: TYPES.DATE, description: 'When the lead was received by the system', example: '2026-07-10T14:31:00.000Z', path: 'lead.receivedAt', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'lead.ip', label: 'Lead IP', category: CATEGORIES.LEAD, type: TYPES.STRING, description: 'Customer IP address', example: '192.168.1.100', path: 'lead.ip', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'lead.utmSource', label: 'UTM Source', category: CATEGORIES.LEAD, type: TYPES.STRING, description: 'UTM source parameter', example: 'facebook', path: 'lead.utmSource', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'lead.utmCampaign', label: 'UTM Campaign', category: CATEGORIES.LEAD, type: TYPES.STRING, description: 'UTM campaign parameter', example: 'summer_sale', path: 'lead.utmCampaign', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'lead.utmMedium', label: 'UTM Medium', category: CATEGORIES.LEAD, type: TYPES.STRING, description: 'UTM medium parameter', example: 'cpc', path: 'lead.utmMedium', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'lead.utmContent', label: 'UTM Content', category: CATEGORIES.LEAD, type: TYPES.STRING, description: 'UTM content parameter', example: 'ad_variant_a', path: 'lead.utmContent', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'lead.utmTerm', label: 'UTM Term', category: CATEGORIES.LEAD, type: TYPES.STRING, description: 'UTM term parameter', example: 'insurance leads', path: 'lead.utmTerm', required: false, availableInPayload: true, availableInPreview: true },

  // ── Buyer ─────────────────────────────────────────────
  { key: 'buyer.id', label: 'Buyer ID', category: CATEGORIES.BUYER, type: TYPES.STRING, description: 'Unique buyer identifier', example: 'bu_x1y2z3', path: 'buyer.id', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'buyer.name', label: 'Buyer Name', category: CATEGORIES.BUYER, type: TYPES.STRING, description: 'Buyer company or contact name', example: 'Genesis Insurance', path: 'buyer.name', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'buyer.email', label: 'Buyer Email', category: CATEGORIES.BUYER, type: TYPES.STRING, description: 'Buyer email address', example: 'deals@genesis.com', path: 'buyer.email', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'buyer.phone', label: 'Buyer Phone', category: CATEGORIES.BUYER, type: TYPES.STRING, description: 'Buyer phone number', example: '+18005559876', path: 'buyer.phone', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'buyer.userId', label: 'Buyer User ID', category: CATEGORIES.BUYER, type: TYPES.STRING, description: 'Associated user account ID', example: 'usr_b1c2d3', path: 'buyer.userId', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'buyer.weight', label: 'Buyer Weight', category: CATEGORIES.BUYER, type: TYPES.NUMBER, description: 'Weighted routing weight value', example: 3, path: 'buyer.weight', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'buyer.priority', label: 'Buyer Priority', category: CATEGORIES.BUYER, type: TYPES.NUMBER, description: 'Priority routing rank (lower = higher priority)', example: 1, path: 'buyer.priority', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'buyer.cap', label: 'Buyer Cap', category: CATEGORIES.BUYER, type: TYPES.NUMBER, description: 'Maximum leads allowed for this buyer', example: 100, path: 'buyer.cap', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'buyer.remainingCap', label: 'Buyer Remaining Cap', category: CATEGORIES.BUYER, type: TYPES.NUMBER, description: 'Remaining leads before cap is reached', example: 75, path: 'buyer.remainingCap', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'buyer.status', label: 'Buyer Status', category: CATEGORIES.BUYER, type: TYPES.STRING, description: 'Buyer active/inactive status', example: 'active', path: 'buyer.status', required: false, availableInPayload: true, availableInPreview: true },

  // ── Campaign ──────────────────────────────────────────
  { key: 'campaign.id', label: 'Campaign ID', category: CATEGORIES.CAMPAIGN, type: TYPES.STRING, description: 'Unique campaign identifier', example: 'cm_p1q2r3', path: 'campaign.id', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'campaign.name', label: 'Campaign Name', category: CATEGORIES.CAMPAIGN, type: TYPES.STRING, description: 'Campaign display name', example: 'Facebook Insurance Leads', path: 'campaign.name', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'campaign.routingType', label: 'Campaign Routing Type', category: CATEGORIES.CAMPAIGN, type: TYPES.STRING, description: 'Routing strategy used for this campaign', example: 'round-robin', path: 'campaign.routingType', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'campaign.description', label: 'Campaign Description', category: CATEGORIES.CAMPAIGN, type: TYPES.STRING, description: 'Campaign description or notes', example: 'Q3 insurance lead gen', path: 'campaign.description', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'campaign.createdAt', label: 'Campaign Created At', category: CATEGORIES.CAMPAIGN, type: TYPES.DATE, description: 'When the campaign was created', example: '2026-06-01T10:00:00.000Z', path: 'campaign.createdAt', required: false, availableInPayload: true, availableInPreview: true },

  // ── Assignment ────────────────────────────────────────
  { key: 'assignment.id', label: 'Assignment ID', category: CATEGORIES.ASSIGNMENT, type: TYPES.STRING, description: 'Unique assignment identifier', example: 'asg_m1n2o3', path: 'assignment.id', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'assignment.timestamp', label: 'Assignment Timestamp', category: CATEGORIES.ASSIGNMENT, type: TYPES.DATE, description: 'When the lead was assigned', example: '2026-07-10T14:32:00.000Z', path: 'assignment.timestamp', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'assignment.roundRobinPosition', label: 'Round Robin Position', category: CATEGORIES.ASSIGNMENT, type: TYPES.NUMBER, description: 'Current round-robin index at time of assignment', example: 3, path: 'assignment.roundRobinPosition', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'assignment.weightUsed', label: 'Weight Used', category: CATEGORIES.ASSIGNMENT, type: TYPES.NUMBER, description: 'Weight value used for weighted routing', example: 5, path: 'assignment.weightUsed', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'assignment.deliveryAttempt', label: 'Delivery Attempt', category: CATEGORIES.ASSIGNMENT, type: TYPES.NUMBER, description: 'Which delivery attempt this is', example: 1, path: 'assignment.deliveryAttempt', required: false, availableInPayload: true, availableInPreview: true },

  // ── System ────────────────────────────────────────────
  { key: 'system.date', label: 'Current Date', category: CATEGORIES.SYSTEM, type: TYPES.DATE, description: 'Current date in YYYY-MM-DD format', example: '2026-07-10', path: 'system.date', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'system.time', label: 'Current Time', category: CATEGORIES.SYSTEM, type: TYPES.STRING, description: 'Current time in HH:MM:SS format', example: '14:30:00', path: 'system.time', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'system.timestamp', label: 'Current Timestamp', category: CATEGORIES.SYSTEM, type: TYPES.DATE, description: 'Full ISO 8601 timestamp', example: '2026-07-10T14:30:00.000Z', path: 'system.timestamp', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'system.uuid', label: 'Random UUID', category: CATEGORIES.SYSTEM, type: TYPES.STRING, description: 'Unique identifier generated per execution', example: '550e8400-e29b-41d4-a716-446655440000', path: 'system.uuid', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'system.environment', label: 'Environment', category: CATEGORIES.SYSTEM, type: TYPES.STRING, description: 'Current deployment environment', example: 'production', path: 'system.environment', required: false, availableInPayload: true, availableInPreview: true },
]

class VariableRegistry {
  constructor() {
    this._variables = []
    this._byKey = new Map()
    this._byCategory = new Map()
    this._cache = null
    this._build()
  }

  _build() {
    this._variables = Object.freeze([...VARIABLES])
    this._byKey.clear()
    this._byCategory.clear()

    for (const v of this._variables) {
      this._byKey.set(v.key, v)
      if (!this._byCategory.has(v.category)) {
        this._byCategory.set(v.category, [])
      }
      this._byCategory.get(v.category).push(v)
    }

    this._cache = Object.freeze({
      variables: this._variables,
      categories: Object.freeze(Object.fromEntries(this._byCategory)),
    })
  }

  getAll() {
    return this._variables
  }

  getByKey(key) {
    return this._byKey.get(key) || null
  }

  getCategories() {
    return this._cache.categories
  }

  search(query) {
    if (!query) return this._variables
    const q = query.toLowerCase()
    return this._variables.filter(
      (v) =>
        v.key.toLowerCase().includes(q) ||
        v.label.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q)
    )
  }

  getByCategory(category) {
    return this._byCategory.get(category) || []
  }

  getPayloadVariables() {
    return this._variables.filter((v) => v.availableInPayload)
  }

  getPreviewVariables() {
    return this._variables.filter((v) => v.availableInPreview)
  }

  validateTemplate(template) {
    const regex = /\{\{([^}]+)\}\}/g
    const errors = []
    let match

    while ((match = regex.exec(template)) !== null) {
      const varKey = match[1].trim()
      if (!this._byKey.has(varKey)) {
        const suggestion = this._variables.find(
          (v) => v.key.toLowerCase().includes(varKey.toLowerCase()) ||
            levenshteinDistance(v.key, varKey) <= 2
        )
        errors.push({
          variable: varKey,
          position: match.index,
          suggestion: suggestion ? suggestion.key : null,
        })
      }
    }

    return { valid: errors.length === 0, errors }
  }

  renderTemplate(template, context) {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmed = key.trim()
      const parts = trimmed.split('.')
      let value = context
      for (const part of parts) {
        if (value == null || typeof value !== 'object') return match
        value = value[part]
      }
      return value !== undefined && value !== null ? String(value) : match
    })
  }

  generatePreview() {
    const preview = {}
    for (const v of this._variables) {
      const parts = v.path.split('.')
      let obj = preview
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]]) obj[parts[i]] = {}
        obj = obj[parts[i]]
      }
      obj[parts[parts.length - 1]] = v.example
    }
    return preview
  }

  generateTestPayload() {
    return this.generatePreview()
  }

  resolveValue(path, context) {
    const parts = path.split('.')
    let value = context
    for (const part of parts) {
      if (value == null || typeof value !== 'object') return undefined
      value = value[part]
    }
    return value
  }
}

function levenshteinDistance(a, b) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

const registry = new VariableRegistry()
module.exports = registry
