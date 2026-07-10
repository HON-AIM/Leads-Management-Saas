import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { TrendCharts } from '@/components/analytics/TrendCharts'
import { SourceAnalytics } from '@/components/analytics/SourceAnalytics'
import { BuyerPerformance } from '@/components/analytics/BuyerPerformance'
import { DeliverySuccessRate } from '@/components/analytics/DeliverySuccessRate'
import { CampaignAnalytics } from '@/components/analytics/CampaignAnalytics'
import { ExportableReports } from '@/components/analytics/ExportableReports'
import { LoadingScreen } from '@/components/feedback/LoadingScreen'
import { AnalyticsErrorAlert } from '@/components/analytics/AnalyticsErrorAlert'
import { formatNumber, cn } from '@/lib/utils'
import type { DashboardStats } from '@/types'

const PERIOD_OPTIONS = [
  { label: '24 hours', value: '24h' },
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
]

const EXEC_STATS = [
  {
    key: 'totalLeads',
    label: 'Total Leads',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    ),
    color: 'from-blue-500/10 to-blue-600/5',
    iconColor: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950',
  },
  {
    key: 'leadsToday',
    label: 'Today',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
    ),
    color: 'from-violet-500/10 to-violet-600/5',
    iconColor: 'text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-950',
  },
  {
    key: 'conversionRate',
    label: 'Conv. Rate',
    suffix: '%',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
    ),
    color: 'from-emerald-500/10 to-emerald-600/5',
    iconColor: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950',
  },
  {
    key: 'activeClients',
    label: 'Active Buyers',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" /></svg>
    ),
    color: 'from-amber-500/10 to-amber-600/5',
    iconColor: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950',
  },
]

export function AnalyticsPage() {
  const { user, isAdmin } = useAuth()
  const [period, setPeriod] = useState('30d')

  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: [...QUERY_KEYS.STATS, 'analytics', period],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/stats?period=${period}`)
      return data
    },
    refetchInterval: 30_000,
  })

  const errorMessage = error instanceof Error ? error.message : null

  if (isLoading) return <LoadingScreen fullScreen={false} />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Executive Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive lead, delivery, and campaign intelligence
          </p>
        </div>
        <Select
          options={PERIOD_OPTIONS}
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="h-9 w-[140px]"
        />
      </div>

      {errorMessage && <AnalyticsErrorAlert message={errorMessage} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {EXEC_STATS.map((card) => {
          const value = (stats as any)?.[card.key] ?? 0
          return (
            <Card key={card.key} className="relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${card.color}`} />
              <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <div className={`rounded-lg p-2 ${card.iconColor}`}>
                  {card.icon}
                </div>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-2xl font-bold">
                  {card.suffix === '%' ? value?.toFixed(1) : formatNumber(value)}
                  {card.suffix}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <TrendCharts />

      <div className="grid gap-4 lg:grid-cols-2">
        <SourceAnalytics />
        <DeliverySuccessRate />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BuyerPerformance />
        <CampaignAnalytics />
      </div>

      <ExportableReports />
    </div>
  )
}
