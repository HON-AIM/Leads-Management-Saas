export interface Client {
  _id: string
  name: string
  email: string
  state: string
  country: string
  phone?: string
  address?: string
  leadCap: number
  leadsReceived: number
  status: 'active' | 'full' | 'inactive'
  routingMode: 'round_robin' | 'weighted' | 'priority' | 'exclusive'
  weight: number
  priority: number
  allowedStates: string[]
  allowedCountries: string[]
  isPaused: boolean
  pausedAt?: string
  pausedReason?: string
  dailyCap: number
  monthlyCap: number
  dailyLeadsReceived: number
  monthlyLeadsReceived: number
  pricePerLead?: number
  minBid?: number
  isFallbackBuyer?: boolean
  routingRules?: {
    allowedZips?: string[]
    blockedZips?: string[]
    requiredFields?: string[]
    allowedSources?: string[]
    blockedSources?: string[]
    minQualityScore?: number
    customFilters?: { field: string; operator: string; value?: unknown }[]
  }
  lastAssignedAt?: string
  schedule: {
    enabled: boolean
    timezone: string
    days: number[]
    startTime: string
    endTime: string
  }
  fallbackGroup?: string
  delivery: {
    provider: 'ghl' | 'webhook' | 'email' | 'none'
    config: {
      webhookUrl?: string
      apiKey?: string
      locationId?: string
      customHeaders?: Record<string, string>
    }
  }
  deliveryRate?: number
  tenantId: string
  createdAt: string
}

export type BuyerFormData = Omit<Client, '_id' | 'tenantId' | 'createdAt' | 'leadsReceived' | 'dailyLeadsReceived' | 'monthlyLeadsReceived' | 'lastAssignedAt' | 'status' | 'deliveryRate' | 'schedule'> & {
  schedule: {
    enabled: boolean
    timezone: string
    days: number[]
    startTime: string
    endTime: string
  }
  delivery: {
    provider: 'ghl' | 'webhook' | 'email' | 'none'
    config: {
      webhookUrl: string
      apiKey: string
      locationId: string
      customHeaders: string
    }
  }
}

export interface WebhookTestResult {
  status: number
  statusText: string
  body: string
  duration: number
  timestamp: string
}

export interface CapUsage {
  daily: { used: number; cap: number }
  monthly: { used: number; cap: number }
  total: { used: number; cap: number }
  percentUsed: number
}

export interface BuyerStats {
  totalLeads: number
  deliveredLeads: number
  failedLeads: number
  deliveryRate: number
  dailyUsage: number
  monthlyUsage: number
  dailyCap: number
  monthlyCap: number
  leadCap: number
}

export interface DashboardStats {
  totalLeads: number
  totalClients: number
  leadsToday: number
  unassignedLeads: number
  totalAssignedLeads: number
  assignedClients: number
  activeClients: number
  failedDeliveries: number
  conversionRate: number
  leadsThisWeek: number
  leadsThisMonth: number
  activeCampaigns: number
}

export interface Activity {
  _id: string
  type: string
  message: string
  clientId?: { _id: string; name: string }
  leadId?: { _id: string; name: string; email: string }
  tenantId: string
  createdAt: string
}

export interface StatDelta {
  value: number
  label: string
  trend: 'up' | 'down' | 'neutral'
  percent: number
}

export interface BuyerDistribution {
  name: string
  value: number
  color: string
  leadsReceived: number
  capUsed: number
  capTotal: number
}

export interface SourceAnalytic {
  source: string
  count: number
  converted: number
  rate: number
}

export interface FailedDelivery {
  _id: string
  leadName: string
  leadEmail: string
  clientName: string
  state: string
  reason: string
  failedAt: string
  retryCount: number
}

export interface CampaignOverview {
  _id: string
  name: string
  leads: number
  converted: number
  active: boolean
  startDate: string
  endDate?: string
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down'
  uptime: number
  leadsProcessed: number
  queueDepth: number
  avgProcessingTime: number
  errorRate: number
  lastIncident?: string
  services: {
    name: string
    status: 'operational' | 'degraded' | 'down'
    latency: number
  }[]
}

export interface LiveLeadEvent {
  type: 'lead_received' | 'lead_assigned' | 'lead_failed' | 'lead_converted'
  leadId: string
  leadName: string
  leadEmail: string
  clientName?: string
  state?: string
  source?: string
  timestamp: string
}

// ─── Analytics Dashboard Types ────────────────────────────────────────────────────

export interface TrendDataPoint {
  date: string
  leads: number
  deliveries: number
  conversions: number
  failed: number
}

export interface TrendSummary {
  totalLeads: number
  totalConversions: number
  totalFailed: number
  conversionRate: number
  leadGrowth: number
  conversionGrowth: number
}

export interface SourceBreakdown {
  source: string
  count: number
  converted: number
  rate: number
  trend: 'up' | 'down' | 'stable'
}

export interface BuyerPerformanceData {
  _id: string
  name: string
  totalLeads: number
  delivered: number
  failed: number
  converted: number
  deliveryRate: number
  conversionRate: number
  avgResponseTime: number
  capUtilization: number
  dailyAverage: number
}

export interface DeliveryRateData {
  success: number
  failed: number
  retrying: number
  pending: number
  successRate: number
  byProvider: { provider: string; success: number; failed: number; total: number; rate: number }[]
  trend: { date: string; rate: number; total: number }[]
}

export interface CampaignAnalyticsData {
  _id: string
  name: string
  status: string
  totalLeads: number
  assignedLeads: number
  convertedLeads: number
  conversionRate: number
  activeBuyers: number
  sources: string[]
  dailyLeads: { date: string; count: number }[]
  trend: 'up' | 'down' | 'stable'
}

export interface HeatmapData {
  day: string
  hour: number
  value: number
}

export interface ReportType {
  key: string
  label: string
  description: string
  icon: string
}
