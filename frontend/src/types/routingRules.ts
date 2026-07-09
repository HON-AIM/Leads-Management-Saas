export type RuleOperator = 'eq' | 'ne' | 'in' | 'not_in' | 'contains' | 'gte' | 'lte' | 'exists' | 'not_exists'

export interface CustomFilterRule {
  field: string
  operator: RuleOperator
  value?: string | number | string[]
}

export interface BuyerRoutingRules {
  allowedZips?: string[]
  blockedZips?: string[]
  acceptAllStates?: boolean
  requiredFields?: string[]
  allowedSources?: string[]
  blockedSources?: string[]
  minQualityScore?: number
  customFilters?: CustomFilterRule[]
}

export const RULE_OPERATORS: { label: string; value: RuleOperator }[] = [
  { label: 'Equals', value: 'eq' },
  { label: 'Not equals', value: 'ne' },
  { label: 'In list', value: 'in' },
  { label: 'Not in list', value: 'not_in' },
  { label: 'Contains', value: 'contains' },
  { label: 'Greater or equal', value: 'gte' },
  { label: 'Less or equal', value: 'lte' },
  { label: 'Exists', value: 'exists' },
  { label: 'Not exists', value: 'not_exists' },
]

export const LEAD_FIELDS = [
  { label: 'State', value: 'state' },
  { label: 'Zip', value: 'zip' },
  { label: 'Email', value: 'email' },
  { label: 'Phone', value: 'phone' },
  { label: 'Source', value: 'source' },
  { label: 'City', value: 'city' },
  { label: 'Campaign', value: 'campaign' },
  { label: 'Metadata.vertical', value: 'metadata.vertical' },
  { label: 'Metadata.product', value: 'metadata.product' },
  { label: 'Raw.custom_field', value: 'raw.custom_field' },
]

export const REQUIRED_FIELD_OPTIONS = ['email', 'phone', 'name', 'state', 'zip']
