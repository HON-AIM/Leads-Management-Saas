export interface FinancialPeriodStats {
  leads: number
  accepted: number
  returned: number
  revenue: number
  cost: number
  profit: number
  acceptRate: number
  cpl: number
  profitMargin: number
  roi: number
}

export interface FinancialOverview {
  period: string
  current: FinancialPeriodStats
  previous: FinancialPeriodStats
  deltas: {
    revenue: number
    cost: number
    profit: number
    profitMargin: number
    leads: number
    acceptRate: number
    cpl: number
    roi: number
  }
}

export interface DailyPnLRow {
  date: string
  leads: number
  accepted: number
  revenue: number
  cost: number
  profit: number
  cpl: number
}

export interface FinancialReportRow {
  period: string
  leads: number
  accepted: number
  cpl: number
  acceptRate: number
  revenue: number
  cost: number
  profit: number
  profitMargin: number
  roi: number
}

export interface PingSessionBid {
  buyerId: string
  buyerName: string
  amount: number
  status: string
  source: string
  respondedAt: string
}

export interface PingSession {
  id: string
  status: string
  pingPayload: Record<string, unknown>
  bids: PingSessionBid[]
  winnerBuyerId?: string
  winningBid?: number
  expiresAt: string
}
