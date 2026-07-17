import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/useNotifications'
import { DeliveryFilters } from '@/components/delivery/DeliveryFilters'
import { DeliveryLogsTable } from '@/components/delivery/DeliveryLogsTable'
import { PayloadInspector } from '@/components/delivery/PayloadInspector'
import { DeliveryCharts } from '@/components/delivery/DeliveryCharts'
import { formatNumber, formatPercentage } from '@/lib/utils'
import { getTextColor, DELIVERY_STATUS_COLOR } from '@/lib/statusColors'
import type { DeliveryLog, DeliveryStats, DeliveryTrendsResponse, DeliveryFilters as Filters } from '@/types/delivery'
import type { Buyer } from '@/types/buyer'
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react'

const DEFAULT_FILTERS: Filters = { status: '', provider: '', buyerId: '', dateFrom: '', dateTo: '' }

export function DeliveryPage() {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [skip, setSkip] = useState(0)
  const [inspectLog, setInspectLog] = useState<DeliveryLog | null>(null)
  const [showCharts, setShowCharts] = useState(true)
  const limit = 30

  const queryParams = new URLSearchParams()
  queryParams.set('limit', limit.toString())
  queryParams.set('skip', skip.toString())
  if (filters.status) queryParams.set('status', filters.status)
  if (filters.provider) queryParams.set('provider', filters.provider)
  if (filters.buyerId) queryParams.set('buyerId', filters.buyerId)
  if (filters.dateFrom) queryParams.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) queryParams.set('dateTo', filters.dateTo)

  const { data: logsData, isLoading: logsLoading } = useQuery<{ success: boolean; data: DeliveryLog[]; pagination: { total: number; page: number; pages: number } }>({
    queryKey: [...QUERY_KEYS.DELIVERY_LOGS, 'list', { ...filters, skip }],
    queryFn: async () => {
      const { data } = await api.get(`/delivery-logs?${queryParams.toString()}`)
      return data
    },
  })

  const { data: statsData } = useQuery<DeliveryStats>({
    queryKey: QUERY_KEYS.DELIVERY_STATS,
    queryFn: async () => {
      const { data } = await api.get('/delivery-logs/stats')
      return data
    },
  })

  const { data: trendsData, isLoading: trendsLoading } = useQuery<DeliveryTrendsResponse>({
    queryKey: QUERY_KEYS.DELIVERY_TRENDS,
    queryFn: async () => {
      const { data } = await api.get('/delivery-logs/trends?days=14')
      return data
    },
  })

  const { data: buyersData } = useQuery<Buyer[]>({
    queryKey: QUERY_KEYS.CLIENTS,
    queryFn: async () => {
      const { data } = await api.get('/buyers')
      return data.data ?? data.buyers ?? data
    },
  })

  const retryMutation = useMutation({
    mutationFn: async (logId: string) => {
      const { data } = await api.post(`/delivery-logs/retry/${logId}`)
      return data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Retry triggered', description: 'Delivery retry has been initiated' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.DELIVERY_LOGS })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.DELIVERY_STATS })
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to retry delivery' }),
  })

  const handleFilterChange = useCallback((newFilters: Filters) => {
    setFilters(newFilters)
    setSkip(0)
  }, [])

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setSkip(0)
  }, [])

  const logs = logsData?.data || []
  const total = logsData?.pagination?.total || 0
  const buyers = (buyersData || []).map((b: Buyer) => ({ _id: b._id, name: b.name }))

  const successRate = statsData && statsData.total > 0
    ? (statsData.success / statsData.total) * 100
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-white tracking-tight">Delivery</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Monitor delivery logs, retry failures, and inspect payloads
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowCharts(!showCharts)}>
          <BarChart3 size={13} className="mr-1.5" />
          {showCharts ? (
            <span className="flex items-center gap-1">Hide <ChevronUp size={12} /></span>
          ) : (
            <span className="flex items-center gap-1">Show <ChevronDown size={12} /></span>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <StatCard label="Total" value={formatNumber(statsData?.total || 0)} />
        <StatCard label="Success" value={formatNumber(statsData?.success || 0)} color={getTextColor(DELIVERY_STATUS_COLOR['success'] ?? 'neutral')} />
        <StatCard label="Failed" value={formatNumber(statsData?.failed || 0)} color={getTextColor(DELIVERY_STATUS_COLOR['failed'] ?? 'neutral')} />
        <StatCard label="Retrying" value={formatNumber(statsData?.retrying || 0)} color={getTextColor(DELIVERY_STATUS_COLOR['retrying'] ?? 'neutral')} />
        <StatCard label="Success Rate" value={formatPercentage(successRate)} />
      </div>

      {showCharts && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Delivery Performance (14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <DeliveryCharts
              trends={trendsData?.trends || []}
              hourly={trendsData?.hourly || []}
              isLoading={trendsLoading}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Delivery Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <DeliveryFilters
              filters={filters}
              buyers={buyers}
              onChange={handleFilterChange}
              onReset={handleResetFilters}
            />
            <DeliveryLogsTable
              logs={logs}
              isLoading={logsLoading}
              total={total}
              limit={limit}
              skip={skip}
              onPageChange={setSkip}
              onRetry={(log) => retryMutation.mutate(log._id)}
              onInspect={setInspectLog}
            />
          </div>
        </CardContent>
      </Card>

      {inspectLog && (
        <PayloadInspector log={inspectLog} onClose={() => setInspectLog(null)} />
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] p-5">
      <p className="text-[12px] text-muted-foreground font-medium">{label}</p>
      <p className={`text-[22px] font-semibold mt-1 ${color || 'text-white'}`}>{value}</p>
    </div>
  )
}
