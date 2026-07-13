export interface Buyer {
  _id: string
  name: string
  email: string
  phone?: string
  status: 'active' | 'paused' | 'inactive' | 'full'
  leadCap: number
  dailyCap: number
  monthlyCap: number
  leadsReceived: number
  dailyLeadsReceived: number
  monthlyLeadsReceived: number
  lastAssignedAt?: string
  pricePerLead: number
  weight: number
  priority: number
  allowedStates: string[]
  delivery: {
    provider: 'none' | 'webhook' | 'ghl'
    url?: string
    apiKey?: string
    locationId?: string
    secret?: string
    payloadTemplate?: string | null
  }
  schedule: {
    enabled: boolean
    timezone: string
    days: number[]
    startTime: string
    endTime: string
  }
  tenantId: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface BuyerFormData {
  name: string
  email: string
  phone: string
  weight: number
  priority: number
  allowedStates: string[]
  leadCap: number
  dailyCap: number
  monthlyCap: number
  delivery: {
    provider: 'none' | 'webhook' | 'ghl'
    url: string
    apiKey: string
    locationId: string
  }
}

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
] as const


