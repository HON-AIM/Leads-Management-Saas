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
import type { DeliveryLog, DeliveryStats, DeliveryTrendsResponse, DeliveryFilters as Filters } from '@/types/delivery'
import type { Client } from '@/types'

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

  const { data: logsData, isLoading: logsLoading } = useQuery<{ success: boolean; logs: DeliveryLog[]; total: number }>({
    queryKey: [...QUERY_KEYS.DELIVERY_LOGS, 'list', { ...filters, skip }],
    queryFn: async () => {
      const { data } = await api.get(`/delivery/logs?${queryParams.toString()}`)
      return data
    },
  })

  const { data: statsData } = useQuery<{ success: boolean } & DeliveryStats>({
    queryKey: QUERY_KEYS.DELIVERY_STATS,
    queryFn: async () => {
      const { data } = await api.get('/delivery/stats')
      return data
    },
  })

  const { data: trendsData, isLoading: trendsLoading } = useQuery<DeliveryTrendsResponse>({
    queryKey: QUERY_KEYS.DELIVERY_TRENDS,
    queryFn: async () => {
      const { data } = await api.get('/delivery/trends?days=14')
      return data
    },
  })

  const { data: buyersData } = useQuery<Client[]>({
    queryKey: QUERY_KEYS.CLIENTS,
    queryFn: async () => {
      const { data } = await api.get('/clients')
      return data.clients || data
    },
  })

  const retryMutation = useMutation({
    mutationFn: async (logId: string) => {
      const { data } = await api.post(`/delivery/retry/${logId}`)
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

  const logs = logsData?.logs || []
  const total = logsData?.total || 0
  const buyers = (buyersData || []).map((b: Client) => ({ _id: b._id, name: b.name }))

  const successRate = statsData && statsData.total > 0
    ? (statsData.success / statsData.total) * 100
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Delivery Monitor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor delivery logs, retry failures, and inspect payloads
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowCharts(!showCharts)}>
          {showCharts ? 'Hide Charts' : 'Show Charts'}
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold mt-1">{formatNumber(statsData?.total || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Success</p>
            <p className="text-2xl font-semibold mt-1 text-emerald-600 dark:text-emerald-400">{formatNumber(statsData?.success || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-2xl font-semibold mt-1 text-red-600 dark:text-red-400">{formatNumber(statsData?.failed || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Retrying</p>
            <p className="text-2xl font-semibold mt-1 text-amber-600 dark:text-amber-400">{formatNumber(statsData?.retrying || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Success Rate</p>
            <p className="text-2xl font-semibold mt-1">{formatPercentage(successRate)}</p>
          </CardContent>
        </Card>
      </div>

      {showCharts && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Delivery Performance (14 days)</CardTitle>
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Delivery Logs</CardTitle>
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
