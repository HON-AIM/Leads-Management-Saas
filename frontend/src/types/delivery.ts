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
  _id: string
  total: number
  success: number
  failed: number
  retrying: number
  avgDuration: number
  maxDuration: number
}

export interface DeliveryHourlyTrend {
  _id: string
  count: number
  avgDuration: number
}

export interface DeliveryTrendsResponse {
  success: boolean
  trends: DeliveryTrend[]
  hourly: DeliveryHourlyTrend[]
  days: number
}

export interface DeliveryFilters {
  status: string
  provider: string
  buyerId: string
  dateFrom: string
  dateTo: string
}

export const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Success', value: 'success' },
  { label: 'Failed', value: 'failed' },
  { label: 'Retrying', value: 'retrying' },
]

export const PROVIDER_OPTIONS = [
  { label: 'All Providers', value: '' },
  { label: 'Webhook', value: 'webhook' },
  { label: 'GHL', value: 'ghl' },
  { label: 'Email', value: 'email' },
  { label: 'None', value: 'none' },
]

export const STATUS_STYLES: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  retrying: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
}
