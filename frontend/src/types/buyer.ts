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

export const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-400 dark:ring-emerald-400/30',
  paused: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-400 dark:ring-amber-400/30',
  inactive: 'bg-gray-50 text-gray-600 ring-gray-500/20 dark:bg-gray-900 dark:text-gray-400 dark:ring-gray-400/30',
  full: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-400 dark:ring-blue-400/30',
}
