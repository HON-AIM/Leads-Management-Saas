export interface CampaignFormData {
  name: string
  description: string
  source: string
  webhookUrl: string
  routingMode: 'round_robin' | 'weighted' | 'priority' | 'exclusive'
  assignedBuyers: { buyerId: string; weight: number; priority: number }[]
  costPerLead: number
  dedupWindowHours: number
}

export interface Campaign {
  _id: string
  name: string
  description?: string
  status: 'active' | 'inactive'
  source: string
  webhookUrl: string
  routingMode: 'round_robin' | 'weighted' | 'priority' | 'exclusive'
  costPerLead?: number
  dedupWindowHours?: number
  assignedBuyers: {
    buyerId: { _id: string; name: string; email: string; status: string }
    weight: number
    priority: number
  }[]
  leadsToday: number
  lastActivityAt?: string
  tenantId: string
  createdAt: string
  updatedAt: string
}

export const ROUTING_MODES = [
  { label: 'Round Robin', value: 'round_robin', description: 'Rotate leads evenly across buyers' },
  { label: 'Weighted', value: 'weighted', description: 'Distribute by buyer weight' },
  { label: 'Priority', value: 'priority', description: 'Send to highest-priority buyer first' },
] as const

export const SOURCE_OPTIONS = [
  'webhook', 'website', 'facebook', 'google', 'api', 'form', 'manual',
] as const
