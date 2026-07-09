export interface CampaignFormData {
  name: string
  description: string
  startDate: string
  endDate: string
  routingMode: 'round_robin' | 'weighted' | 'priority' | 'exclusive' | 'ping_post'
  sources: string[]
  assignedBuyers: { buyerId: string; weight: number }[]
  costPerLead: number
  pingTimeoutMs: number
}

export interface Campaign {
  _id: string
  name: string
  description?: string
  status: 'active' | 'inactive' | 'completed'
  startDate?: string
  endDate?: string
  routingMode: 'round_robin' | 'weighted' | 'priority' | 'exclusive' | 'ping_post'
  sources: string[]
  costPerLead?: number
  pingTimeoutMs?: number
  assignedBuyers: {
    buyerId: { _id: string; name: string; email: string; state: string }
    weight: number
  }[]
  totalLeads: number
  assignedLeads: number
  convertedLeads: number
  tenantId: string
  createdAt: string
  updatedAt: string
}

export const ROUTING_MODES = [
  { label: 'Round Robin', value: 'round_robin', description: 'Rotate leads evenly across buyers' },
  { label: 'Weighted', value: 'weighted', description: 'Distribute by buyer weight' },
  { label: 'Priority', value: 'priority', description: 'Send to highest-priority buyer first' },
  { label: 'Exclusive', value: 'exclusive', description: 'All leads to primary buyer' },
  { label: 'Ping-Post', value: 'ping_post', description: 'Auction — highest bidder wins the lead' },
] as const

export const SOURCE_OPTIONS = [
  'website', 'facebook', 'google', 'webhook', 'api', 'form', 'manual', 'other',
] as const
