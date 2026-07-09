import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import { useSocket } from '@/hooks/useSocket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingScreen } from '@/components/feedback/LoadingScreen'
import { formatNumber, formatDate, cn } from '@/lib/utils'
import { FinancialOverviewPanel } from '@/components/analytics/FinancialOverviewPanel'
import type {
  DashboardStats, Activity, BuyerDistribution, SourceAnalytic,
  FailedDelivery, CampaignOverview, SystemHealth, LiveLeadEvent,
} from '@/types'

function DeltaBadge({ value, trend }: { value: number; trend: 'up' | 'down' | 'neutral' }) {
  if (trend === 'neutral') return null
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
      trend === 'up'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
        : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
    )}>
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {trend === 'up' ? (
          <polyline points="18 15 12 9 6 15" />
        ) : (
          <polyline points="6 9 12 15 18 9" />
        )}
      </svg>
      {Math.abs(value)}%
    </span>
  )
}

const statCards = [
  { key: 'totalLeads', label: 'Total Leads', deltaKey: 'leadsThisWeek', deltaLabel: 'vs last week',
    color: 'from-blue-500/10 to-blue-600/5', iconColor: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950',
    icon: (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>),
  },
  { key: 'leadsToday', label: 'Leads Today', deltaKey: 'leadsThisWeek', deltaLabel: 'this week',
    color: 'from-violet-500/10 to-violet-600/5', iconColor: 'text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-950',
    icon: (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>),
  },
  { key: 'activeClients', label: 'Active Clients', deltaKey: 'totalClients', deltaLabel: 'total registered',
    color: 'from-emerald-500/10 to-emerald-600/5', iconColor: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950',
    icon: (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" /></svg>),
  },
  { key: 'conversionRate', label: 'Conversion Rate', deltaKey: 'totalAssignedLeads', deltaLabel: 'assigned leads',
    color: 'from-amber-500/10 to-amber-600/5', iconColor: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950',
    icon: (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>),
    suffix: '%',
  },
]

const SOURCE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']
const BUYER_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']

export function DashboardPage() {
  const { user, isAdmin } = useAuth()
  const { connected, subscribe } = useSocket()
  const [liveEvents, setLiveEvents] = useState<LiveLeadEvent[]>([])
  const [showHealth, setShowHealth] = useState(false)

  useEffect(() => {
    const unsub = subscribe('live:lead', (event: LiveLeadEvent) => {
      setLiveEvents((prev) => [event, ...prev].slice(0, 50))
    })
    return unsub
  }, [subscribe])

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: QUERY_KEYS.STATS,
    queryFn: async () => {
      const { data } = await api.get('/analytics/stats')
      return data
    },
    refetchInterval: 30_000,
  })

  const { data: activities } = useQuery<Activity[]>({
    queryKey: QUERY_KEYS.ACTIVITIES,
    queryFn: async () => {
      const { data } = await api.get('/analytics/activities?limit=8')
      return data.activities || data
    },
    refetchInterval: 15_000,
  })

  const { data: distribution } = useQuery<BuyerDistribution[]>({
    queryKey: QUERY_KEYS.BUYER_DISTRIBUTION,
    queryFn: async () => {
      const { data } = await api.get('/analytics/buyer-distribution')
      return data.distribution || data
    },
    refetchInterval: 60_000,
  })

  const { data: sources } = useQuery<SourceAnalytic[]>({
    queryKey: QUERY_KEYS.SOURCE_ANALYTICS,
    queryFn: async () => {
      const { data } = await api.get('/analytics/source-analytics')
      return data.sources || data
    },
    refetchInterval: 60_000,
  })

  const { data: failedDeliveries } = useQuery<FailedDelivery[]>({
    queryKey: QUERY_KEYS.FAILED_DELIVERIES,
    queryFn: async () => {
      const { data } = await api.get('/analytics/failed-deliveries?limit=5')
      return data.deliveries || data
    },
    refetchInterval: 30_000,
  })

  const { data: campaigns } = useQuery<CampaignOverview[]>({
    queryKey: QUERY_KEYS.CAMPAIGNS,
    queryFn: async () => {
      const { data } = await api.get('/analytics/campaigns')
      return data.campaigns || data
    },
    refetchInterval: 60_000,
  })

  const { data: recentLeadsData } = useQuery({
    queryKey: ['dashboard-recent-leads'],
    queryFn: async () => {
      const { data } = await api.get('/leads?limit=8')
      return data
    },
    refetchInterval: 30_000,
  })

  const { data: health } = useQuery<SystemHealth>({
    queryKey: QUERY_KEYS.SYSTEM_HEALTH,
    queryFn: async () => {
      const { data } = await api.get('/analytics/system-health')
      return data
    },
    refetchInterval: 15_000,
    enabled: showHealth,
  })

  if (statsLoading) return <LoadingScreen fullScreen={false} />

  const distData = distribution || []
  const sourceData = sources || []
  const failedData = failedDeliveries || []
  const campaignData = campaigns || []
  const routingSnapshot = (recentLeadsData?.leads || []).reduce((acc: any, lead: any) => {
    if (lead.isDuplicate) acc.duplicates += 1
    if (lead.ingestionStatus === 'ping_pending') acc.pingPending += 1
    if (lead.assignmentStatus === 'assigned' || lead.assignedTo) acc.assigned += 1
    else acc.unassigned += 1
    return acc
  }, { assigned: 0, unassigned: 0, duplicates: 0, pingPending: 0 })

  return (
    <div className="space-y-6">
      <FinancialOverviewPanel />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, {user?.firstName || user?.username}
            {connected && (
              <span className="ml-2 inline-flex items-center gap-1 text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                live
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showHealth ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowHealth(!showHealth)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            System
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const value = (stats as any)?.[card.key] ?? 0
          const delta = (stats as any)?.[card.deltaKey]
          const trend = delta != null && value != null
            ? value > 0 && delta > 0
              ? (value / delta > 1.1 ? 'up' : value / delta < 0.9 ? 'down' : 'neutral')
              : 'neutral'
            : 'neutral'
          const percent = delta && value ? Math.round(Math.abs((value - delta) / delta) * 100) : 0

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
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">
                    {card.suffix === '%' ? value?.toFixed(1) : formatNumber(value)}
                    {card.suffix}
                  </p>
                  <DeltaBadge value={percent} trend={trend as 'up' | 'down' | 'neutral'} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {card.deltaLabel}: {formatNumber(delta ?? 0)}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Routing Snapshot</CardTitle>
            <span className="text-xs text-muted-foreground">Recent lead outcomes at a glance</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Assigned', value: routingSnapshot.assigned, tone: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
              { label: 'Unassigned', value: routingSnapshot.unassigned, tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
              { label: 'Duplicates', value: routingSnapshot.duplicates, tone: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' },
              { label: 'Ping Pending', value: routingSnapshot.pingPending, tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xl font-semibold">{formatNumber(item.value)}</span>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${item.tone}`}>{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Buyer Distribution</CardTitle>
              <span className="text-xs text-muted-foreground">Leads received by buyer</span>
            </div>
          </CardHeader>
          <CardContent>
            {distData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No distribution data</p>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ResponsiveContainer width="100%" height={220} className="max-w-[220px]">
                  <PieChart>
                    <Pie
                      data={distData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {distData.map((_, idx) => (
                        <Cell key={idx} fill={BUYER_COLORS[idx % BUYER_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        background: 'hsl(var(--card))',
                        fontSize: '13px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2 w-full">
                  {distData.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: BUYER_COLORS[idx % BUYER_COLORS.length] }} />
                        <span className="truncate max-w-[120px]">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{formatNumber(item.leadsReceived)}</span>
                        <span className="w-16 text-right">{item.capTotal > 0 ? `${Math.round((item.capUsed / item.capTotal) * 100)}% cap` : '-'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Source Analytics</CardTitle>
              <span className="text-xs text-muted-foreground">Lead sources</span>
            </div>
          </CardHeader>
          <CardContent>
            {sourceData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No source data</p>
            ) : (
              <div className="space-y-3">
                {sourceData.map((source) => {
                  const total = sourceData.reduce((a, b) => a + b.count, 0)
                  const pct = total > 0 ? (source.count / total) * 100 : 0
                  return (
                    <div key={source.source}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="capitalize">{source.source.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatNumber(source.count)} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Live Lead Feed</CardTitle>
              <div className="flex items-center gap-2">
                {connected && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
                <span className="text-xs text-muted-foreground">
                  {connected ? 'Real-time' : 'Polling'}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[400px] overflow-y-auto scrollbar-hide">
            {liveEvents.length === 0 && (!activities || activities.length === 0) ? (
              <p className="text-sm text-muted-foreground py-8 text-center px-6">No activity yet. Events will appear here in real-time.</p>
            ) : (
              <div className="divide-y">
                {liveEvents.slice(0, 20).map((event, idx) => (
                  <div key={`live-${event.timestamp}-${idx}`} className="flex items-start gap-3 px-6 py-3 text-sm hover:bg-muted/30 transition-colors">
                    <div className={cn(
                      'mt-0.5 h-2 w-2 shrink-0 rounded-full',
                      event.type === 'lead_received' && 'bg-blue-500',
                      event.type === 'lead_assigned' && 'bg-emerald-500',
                      event.type === 'lead_failed' && 'bg-red-500',
                      event.type === 'lead_converted' && 'bg-violet-500',
                    )} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{event.leadName}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.type === 'lead_received' && `New lead from ${event.source || 'unknown source'}`}
                        {event.type === 'lead_assigned' && `Assigned to ${event.clientName || 'a buyer'}`}
                        {event.type === 'lead_failed' && `Delivery failed — ${event.state || 'unknown state'}`}
                        {event.type === 'lead_converted' && `Converted${event.clientName ? ` via ${event.clientName}` : ''}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
                {activities?.slice(0, 10 - liveEvents.length).map((activity) => (
                  <div key={activity._id} className="flex items-start gap-3 px-6 py-3 text-sm hover:bg-muted/30 transition-colors">
                    <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary/40" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{activity.message}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {new Date(activity.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Failed Deliveries</CardTitle>
              {(stats as any)?.failedDeliveries > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                  {(stats as any).failedDeliveries}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[400px] overflow-y-auto scrollbar-hide">
            {failedData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center px-6">No failed deliveries</p>
            ) : (
              <div className="divide-y">
                {failedData.map((f) => (
                  <div key={f._id} className="px-6 py-3 text-sm hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{f.leadName}</p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {new Date(f.failedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {f.clientName} &middot; {f.state}
                    </p>
                    <p className="text-xs text-red-500 mt-0.5 truncate">{f.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Campaign Overview</CardTitle>
              <span className="text-xs text-muted-foreground">{campaignData.length} active</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {campaignData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No campaigns</p>
            ) : (
              <div className="divide-y">
                {campaignData.map((c) => (
                  <div key={c._id} className="flex items-center justify-between px-6 py-3 text-sm hover:bg-muted/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{c.name}</p>
                        {c.active && (
                          <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatNumber(c.leads)} leads &middot; {formatNumber(c.converted)} converted
                        {c.leads > 0 && ` (${Math.round((c.converted / c.leads) * 100)}%)`}
                      </p>
                    </div>
                    <div className="ml-4 w-20 text-right">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${c.leads > 0 ? (c.converted / c.leads) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {showHealth && health && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">System Health</CardTitle>
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                  health.status === 'healthy' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
                  health.status === 'degraded' && 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
                  health.status === 'down' && 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
                )}>
                  <span className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    health.status === 'healthy' && 'bg-emerald-500',
                    health.status === 'degraded' && 'bg-amber-500',
                    health.status === 'down' && 'bg-red-500',
                  )} />
                  {health.status}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Uptime', value: `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` },
                  { label: 'Leads Processed', value: formatNumber(health.leadsProcessed) },
                  { label: 'Queue Depth', value: formatNumber(health.queueDepth) },
                  { label: 'Avg Processing', value: `${health.avgProcessingTime}ms` },
                  { label: 'Error Rate', value: `${health.errorRate.toFixed(2)}%` },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-0.5 font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Services</p>
                {health.services.map((svc) => (
                  <div key={svc.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'h-2 w-2 rounded-full',
                        svc.status === 'operational' && 'bg-emerald-500',
                        svc.status === 'degraded' && 'bg-amber-500',
                        svc.status === 'down' && 'bg-red-500',
                      )} />
                      <span className="capitalize">{svc.name.replace(/_/g, ' ')}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{svc.latency}ms</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
