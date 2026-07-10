export interface Lead {
  _id: string
  name: string
  email: string
  phone?: string
  state: string
  source: string
  campaignId?: { _id: string; name: string } | null
  status: 'new' | 'assigned' | 'delivered' | 'failed' | 'duplicate' | 'unassigned'
  isDuplicate: boolean
  duplicateOf?: string | null
  rawPayload?: Record<string, any>
  tenantId: string
  createdAt: string
  updatedAt: string
  buyer?: { _id: string; name: string; email: string } | null
  assignmentStatus?: 'pending' | 'delivered' | 'failed' | 'returned' | null
  routingMode?: string | null
}

export interface LeadDetail extends Lead {
  assignment?: {
    buyerId: { _id: string; name: string; email: string }
    routingMode: string
    status: string
    deliveredAt?: string
    createdAt: string
  } | null
  routingLogs?: RoutingLog[]
}

export interface RoutingLog {
  _id: string
  routingMode: string
  eligibleBuyerIds: { _id: string; name: string }[]
  selectedBuyerId: { _id: string; name: string } | null
  reason?: string
  durationMs?: number
  createdAt: string
}

export interface LeadFilters {
  search?: string
  status?: string
  state?: string
  campaign?: string
  buyer?: string
  dateFrom?: string
  dateTo?: string
}

export const STATUS_OPTIONS = [
  { label: 'New', value: 'new' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Failed', value: 'failed' },
  { label: 'Duplicate', value: 'duplicate' },
  { label: 'Unassigned', value: 'unassigned' },
] as const

export const STATUS_STYLES: Record<string, string> = {
  new: 'bg-slate-50 text-slate-700 ring-slate-600/20 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-400/30',
  assigned: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-400 dark:ring-blue-400/30',
  delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-400 dark:ring-emerald-400/30',
  failed: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-400 dark:ring-red-400/30',
  duplicate: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-400 dark:ring-amber-400/30',
  unassigned: 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-950 dark:text-orange-400 dark:ring-orange-400/30',
}

export const DELIVERY_STYLES: Record<string, string> = {
  delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-400 dark:ring-emerald-400/30',
  failed: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-400 dark:ring-red-400/30',
  pending: 'bg-slate-50 text-slate-600 ring-slate-500/20 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-400/30',
  returned: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-400 dark:ring-amber-400/30',
}
