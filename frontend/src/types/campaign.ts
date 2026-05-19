export interface Campaign {
  _id: string
  name: string
  description?: string
  status: 'active' | 'inactive' | 'completed'
  startDate?: string
  endDate?: string
  routingMode: 'round_robin' | 'weighted' | 'exclusive' | 'state_based'
  sources: string[]
  assignedBuyers: {
    buyerId: { _id: string; name: string; email: string; state: string }
    weight: number
  }[]
  stateRouting: {
    state: string
    buyerId: { _id: string; name: string; email: string; state: string }
    priority: number
  }[]
  totalLeads: number
  assignedLeads: number
  convertedLeads: number
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface CampaignFormData {
  name: string
  description: string
  startDate: string
  endDate: string
  routingMode: 'round_robin' | 'weighted' | 'exclusive' | 'state_based'
  sources: string[]
  assignedBuyers: { buyerId: string; weight: number }[]
  stateRouting: { country: string; state: string; buyerId: string; priority: number }[]
}

export const ROUTING_MODES = [
  { label: 'Round Robin', value: 'round_robin' },
  { label: 'Weighted', value: 'weighted' },
  { label: 'Exclusive', value: 'exclusive' },
  { label: 'State Based', value: 'state_based' },
] as const

export const SOURCE_OPTIONS = [
  'website', 'referral', 'facebook', 'google', 'linkedin',
  'email', 'phone', 'chat', 'webhook', 'api', 'manual', 'import', 'other',
] as const
