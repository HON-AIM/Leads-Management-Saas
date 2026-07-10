import type { Lead } from './lead'

export interface BuyerProfile {
  _id: string
  name: string
  email: string
  state: string
  leadCap: number
  leadsReceived: number
  dailyCap: number
  monthlyCap: number
  dailyLeadsReceived: number
  monthlyLeadsReceived: number
  status: 'active' | 'full' | 'inactive'
  isPaused: boolean
  routingMode: string
  delivery?: { provider: string }
}

export interface BuyerStats {
  totalLeads: number
  leadsToday: number
  deliveredCount: number
  failedCount: number
  deliveryRate: number
  leadCap: number
  dailyCap: number
  monthlyCap: number
  dailyLeadsReceived: number
  monthlyLeadsReceived: number
  status: string
  isPaused: boolean
}

export interface CapUsage {
  total: { used: number; cap: number; percent: number }
  daily: { used: number; cap: number; percent: number }
  monthly: { used: number; cap: number; percent: number }
}

export interface BuyerLeadStats {
  total: number
  pending: number
  inProgress: number
  delivered: number
  converted: number
}

export interface BuyerLeadsResponse {
  success: boolean
  leads: Lead[]
  stats?: BuyerLeadStats
  pagination: { page: number; limit: number; total: number; pages: number }
}

export interface BuyerStatsResponse {
  success: boolean
  stats: BuyerStats
  recent: Lead[]
}

export interface BuyerActivity {
  _id: string
  type: string
  message: string
  leadId?: { _id: string; name: string; email: string }
  createdAt: string
}

export const BUYER_STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  full: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
}

export const CAP_COLOR = (pct: number) =>
  pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
