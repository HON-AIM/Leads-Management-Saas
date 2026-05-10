export interface Lead {
  _id: string
  name: string
  email: string
  phone?: string
  state: string
  source: string
  campaign?: string
  assignedTo?: { _id: string; name: string; email: string; state: string; routingMode: string }
  status: 'assigned' | 'unassigned' | 'pending' | 'contacted' | 'converted'
  ingestionStatus: 'received' | 'queued' | 'routing' | 'delivered' | 'failed' | 'duplicate'
  deliveryStatus: 'pending' | 'delivering' | 'delivered' | 'failed' | 'skipped'
  notes?: string
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface RoutingEvent {
  _id: string
  action: string
  fromState: string
  toState: string
  fromClient?: string
  toClient?: string
  reason: string
  triggeredBy: string
  createdAt: string
}

export interface DeliveryEvent {
  _id: string
  stage: string
  status: string
  message: string
  clientName?: string
  duration: number
  createdAt: string
}

export interface LeadDetail extends Lead {
  routingHistory: RoutingEvent[]
  deliveryTimeline: DeliveryEvent[]
  rawPayload?: Record<string, any>
  metadata?: Record<string, any>
  tags?: string[]
  score?: number
}

export interface LeadFilters {
  search?: string
  status?: string
  source?: string
  state?: string
  buyer?: string
  campaign?: string
  dateFrom?: string
  dateTo?: string
  deliveryStatus?: string
}

export interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

export interface LeadsResponse {
  success: boolean
  leads: Lead[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface CreateLeadRequest {
  name: string
  email: string
  phone?: string
  state: string
  source?: string
  notes?: string
}

export const STATUS_OPTIONS = ['assigned', 'unassigned', 'pending', 'contacted', 'converted'] as const
export const DELIVERY_STATUS_OPTIONS = ['pending', 'delivering', 'delivered', 'failed', 'skipped'] as const
export const SOURCE_OPTIONS = ['website', 'referral', 'campaign', 'manual', 'api', 'import'] as const

export const STATUS_STYLES: Record<string, string> = {
  assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  unassigned: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  contacted: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400',
  converted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
}

export const DELIVERY_STYLES: Record<string, string> = {
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  delivering: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  skipped: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
}
