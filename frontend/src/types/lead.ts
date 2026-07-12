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


