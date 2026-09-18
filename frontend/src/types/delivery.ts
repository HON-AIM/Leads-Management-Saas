export interface DeliveryLog {
  _id: string
  leadId: { _id: string; name: string; email: string; phone?: string; state: string } | string
  buyerId?: { _id: string; name: string } | string
  tenantId: string
  provider: string
  attempt: number
  status: 'success' | 'failed' | 'retrying'
  requestPayload?: Record<string, any> | null
  responsePayload?: Record<string, any> | null
  responseCode?: number | null
  duration?: number | null
  error?: string | null
  deliveredAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface DeliveryLogDetail extends DeliveryLog {
  leadName?: string
  leadEmail?: string
  leadState?: string
  buyerName?: string
}

export interface DeliveryStats {
  total: number
  success: number
  failed: number
  retrying: number
  byStatus: { _id: string; count: number; avgDuration: number; maxDuration: number; minDuration: number }[]
}

export interface DeliveryTrend {
  date: string
  delivered: number
  failed: number
  pending: number
  total: number
}

export interface DeliveryHourlyTrend {
  hour: string
  delivered: number
  failed: number
  pending: number
  total: number
}

export interface DeliveryTrendsResponse {
  trends: DeliveryTrend[]
  hourly: DeliveryHourlyTrend[]
}

export interface DeliveryFilters {
  status: string
  provider: string
  buyerId: string
  dateFrom: string
  dateTo: string
}

export const STATUS_OPTIONS = [
  { label: 'Success', value: 'success' },
  { label: 'Failed', value: 'failed' },
  { label: 'Retrying', value: 'retrying' },
]

export const PROVIDER_OPTIONS = [
  { label: 'Webhook', value: 'webhook' },
  { label: 'GHL', value: 'ghl' },
  { label: 'Email', value: 'email' },
  { label: 'None', value: 'none' },
]


