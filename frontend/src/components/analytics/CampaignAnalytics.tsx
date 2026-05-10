import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from 'recharts'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { formatNumber, cn } from '@/lib/utils'
import type { CampaignAnalyticsData } from '@/types'

const PERIOD_OPTIONS = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
]

const SORT_OPTIONS = [
  { label: 'Conversion Rate', value: 'conversionRate' },
  { label: 'Total Leads', value: 'totalLeads' },
  { label: 'Name', value: 'name' },
]

export function CampaignAnalytics() {
  const [period, setPeriod] = useState('30d')
  const [sortBy, setSortBy] = useState('conversionRate')

  const { data, isLoading } = useQuery<{ success: boolean; campaigns: CampaignAnalyticsData[] }>({
    queryKey: [...QUERY_KEYS.CAMPAIGN_ANALYTICS, period],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/leads/campaigns?period=${period}`)
      return data
    },
  })

  const campaigns = data?.campaigns || []

  const sorted = useMemo(() => {
    return [...campaigns].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return ((b as any)[sortBy] ?? 0) - ((a as any)[sortBy] ?? 0)
    })
  }, [campaigns, sortBy])

  const totalLeads = campaigns.reduce((s, c) => s + c.totalLeads, 0)
  const totalConverted = campaigns.reduce((s, c) => s + c.convertedLeads, 0)
  const overallRate = totalLeads > 0 ? (totalConverted / totalLeads) * 100 : 0
  const activeCount = campaigns.filter((c) => c.status === 'active').length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Campaign Analytics</CardTitle>
          <div className="flex items-center gap-2">
            <Select
              options={SORT_OPTIONS}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-8 w-[140px] text-xs"
            />
            <Select
              options={PERIOD_OPTIONS}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-8 w-[130px] text-xs"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total Campaigns</p>
            <p className="text-lg font-semibold mt-0.5">{campaigns.length}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-lg font-semibold mt-0.5 text-emerald-600 dark:text-emerald-400">{activeCount}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total Leads</p>
            <p className="text-lg font-semibold mt-0.5 text-blue-600 dark:text-blue-400">{formatNumber(totalLeads)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Overall Conv. Rate</p>
            <p className="text-lg font-semibold mt-0.5 text-violet-600 dark:text-violet-400">{overallRate.toFixed(1)}%</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-60 text-sm text-muted-foreground">Loading campaign data...</div>
        ) : campaigns.length === 0 ? (
          <div className="flex items-center justify-center h-60 text-sm text-muted-foreground">No campaign data available</div>
        ) : (
          <>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">Campaign Comparison</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sorted} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--card))',
                      fontSize: '13px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="totalLeads" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total Leads" />
                  <Bar dataKey="convertedLeads" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Converted" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">Campaign Details</p>
              <div className="space-y-2">
                {sorted.map((campaign) => (
                  <div
                    key={campaign._id}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={cn(
                        'h-2 w-2 rounded-full',
                        campaign.status === 'active' ? 'bg-emerald-500' : campaign.status === 'completed' ? 'bg-blue-500' : 'bg-muted-foreground'
                      )} />
                      <span className="font-medium truncate">{campaign.name}</span>
                      <Badge className={cn(
                        'text-[10px]',
                        campaign.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                      )}>
                        {campaign.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-muted-foreground shrink-0">
                      <span>{formatNumber(campaign.totalLeads)} leads</span>
                      <span>{campaign.conversionRate.toFixed(1)}% conv.</span>
                      <span>{campaign.activeBuyers} buyers</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
