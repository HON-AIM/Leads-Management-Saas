const payloadTemplateService = require('../../services/payloadTemplateService')

const CATEGORIES = {
  LEAD: 'Lead',
  BUYER: 'Buyer',
  CAMPAIGN: 'Campaign',
  ASSIGNMENT: 'Assignment',
  SYSTEM: 'System',
  SUPPLIER: 'Supplier',
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

const SOURCE_TO_CATEGORY = {
  standard: CATEGORIES.LEAD,
  dynamic: CATEGORIES.CUSTOM_FIELDS,
  campaign: CATEGORIES.CAMPAIGN,
  supplier: CATEGORIES.SUPPLIER,
  system: CATEGORIES.SYSTEM,
}

const SOURCE_TO_TYPE = {
  standard: TYPES.STRING,
  dynamic: TYPES.STRING,
  campaign: TYPES.STRING,
  supplier: TYPES.STRING,
  system: TYPES.DATE,
}

const ASSIGNMENT_VARIABLES = [
  { key: 'assignment.id', flatKey: 'assignment_id', label: 'Assignment ID', category: CATEGORIES.ASSIGNMENT, type: TYPES.STRING, description: 'Unique assignment identifier', example: 'asg_m1n2o3', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'assignment.timestamp', flatKey: 'assignment_timestamp', label: 'Assignment Timestamp', category: CATEGORIES.ASSIGNMENT, type: TYPES.DATE, description: 'When the lead was assigned', example: '2026-07-10T14:32:00.000Z', required: false, availableInPayload: true, availableInPreview: true },
  { key: 'assignment.roundRobinPosition', flatKey: 'assignment_round_robin_position', label: 'Round Robin Position', category: CATEGORIES.ASSIGNMENT, type: TYPES.NUMBER, description: 'Current round-robin index at time of assignment', example: 3, required: false, availableInPayload: true, availableInPreview: true },
  { key: 'assignment.weightUsed', flatKey: 'assignment_weight_used', label: 'Weight Used', category: CATEGORIES.ASSIGNMENT, type: TYPES.NUMBER, description: 'Weight value used for weighted routing', example: 5, required: false, availableInPayload: true, availableInPreview: true },
  { key: 'assignment.deliveryAttempt', flatKey: 'assignment_delivery_attempt', label: 'Delivery Attempt', category: CATEGORIES.ASSIGNMENT, type: TYPES.NUMBER, description: 'Which delivery attempt this is', example: 1, required: false, availableInPayload: true, availableInPreview: true },
]

function buildVariables() {
  const payloadTokens = payloadTemplateService.getAvailableTokens()
  const variables = []

  for (const token of payloadTokens) {
    const category = SOURCE_TO_CATEGORY[token.source] || CATEGORIES.LEAD
    variables.push({
      key: token.token,
      flatKey: token.token,
      label: token.label,
      category,
      type: SOURCE_TO_TYPE[token.source] || TYPES.STRING,
      description: `${token.label} value`,
      example: token.value,
      required: false,
      availableInPayload: true,
      availableInPreview: true,
    })
  }

  variables.push(...ASSIGNMENT_VARIABLES)

  return variables
}

class VariableRegistry {
  constructor() {
    this._variables = []
    this._byKey = new Map()
    this._byFlatKey = new Map()
    this._byCategory = new Map()
    this._cache = null
    this._build()
  }

  _build() {
    this._variables = Object.freeze(buildVariables())
    this._byKey.clear()
    this._byFlatKey.clear()
    this._byCategory.clear()

    for (const v of this._variables) {
      this._byKey.set(v.key, v)
      if (v.flatKey) this._byFlatKey.set(v.flatKey, v)
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
    return this._byKey.get(key) || this._byFlatKey.get(key) || null
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
        (v.flatKey && v.flatKey.toLowerCase().includes(q)) ||
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
      if (!this._byKey.has(varKey) && !this._byFlatKey.has(varKey)) {
        const suggestion = this._variables.find(
          (v) => v.key.toLowerCase().includes(varKey.toLowerCase()) ||
            (v.flatKey && v.flatKey.toLowerCase().includes(varKey.toLowerCase())) ||
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
    return payloadTemplateService.resolveTemplate(template, context.lead, context.buyer, {
      campaign: context.campaign,
      supplier: context.supplier,
    })
  }

  generatePreview() {
    const preview = {}
    for (const v of this._variables) {
      const parts = v.key.split('.')
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
