import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { formatNumber, cn } from '@/lib/utils'
import type { BuyerPerformanceData, HeatmapData } from '@/types'

const PERIOD_OPTIONS = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
]

const METRIC_OPTIONS = [
  { label: 'Delivery Rate', value: 'deliveryRate' },
  { label: 'Conversion Rate', value: 'conversionRate' },
  { label: 'Leads Received', value: 'totalLeads' },
  { label: 'Cap Utilization', value: 'capUtilization' },
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function BuyerPerformance() {
  const [period, setPeriod] = useState('30d')
  const [sortMetric, setSortMetric] = useState('deliveryRate')

  const { data, isLoading, error } = useQuery<{ success: boolean; buyers: BuyerPerformanceData[] }>({
    queryKey: [...QUERY_KEYS.BUYER_PERFORMANCE, period],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/buyers/performance?period=${period}`)
      return data
    },
  })

  const { data: heatmapData } = useQuery<{ success: boolean; hourly: HeatmapData[] }>({
    queryKey: [...QUERY_KEYS.HEATMAP, period],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/delivery/time-distribution?period=${period}`)
      return data
    },
  })

  const buyers = data?.buyers || []
  const errorMessage = error instanceof Error ? error.message : null

  const sortedBuyers = useMemo(() => {
    return [...buyers].sort((a, b) => {
      const aVal = (a as any)[sortMetric] ?? 0
      const bVal = (b as any)[sortMetric] ?? 0
      return bVal - aVal
    })
  }, [buyers, sortMetric])

  const avgDeliveryRate = buyers.length > 0
    ? buyers.reduce((s, b) => s + b.deliveryRate, 0) / buyers.length
    : 0
  const avgConversionRate = buyers.length > 0
    ? buyers.reduce((s, b) => s + b.conversionRate, 0) / buyers.length
    : 0
  const totalLeads = buyers.reduce((s, b) => s + b.totalLeads, 0)

  const heatmap = useMemo(() => {
    const map = new Map<string, number>()
    const data = heatmapData?.hourly || []
    data.forEach((h) => {
      const key = `${h.day}-${h.hour}`
      map.set(key, h.value)
    })
    return map
  }, [heatmapData])

  const maxHeatValue = Math.max(...Array.from(heatmap.values()), 1)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Buyer Performance</CardTitle>
          <div className="flex items-center gap-2">
            <Select
              options={METRIC_OPTIONS}
              value={sortMetric}
              onChange={(e) => setSortMetric(e.target.value)}
              className="h-8 w-[150px] text-xs"
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
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <p className="font-medium">Buyer performance unavailable</p>
            <p className="mt-1">{errorMessage}</p>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Avg Delivery Rate</p>
            <p className="text-lg font-semibold mt-0.5 text-emerald-600 dark:text-emerald-400">{avgDeliveryRate.toFixed(1)}%</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Avg Conversion Rate</p>
            <p className="text-lg font-semibold mt-0.5 text-violet-600 dark:text-violet-400">{avgConversionRate.toFixed(1)}%</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total Leads Routed</p>
            <p className="text-lg font-semibold mt-0.5">{formatNumber(totalLeads)}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-60 text-sm text-muted-foreground">Loading buyer data...</div>
        ) : sortedBuyers.length === 0 ? (
          <div className="flex items-center justify-center h-60 text-sm text-muted-foreground">No buyer data available</div>
        ) : (
          <>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">
                Performance Ranking by {METRIC_OPTIONS.find((o) => o.value === sortMetric)?.label}
              </p>
              <div className="space-y-2">
                {sortedBuyers.slice(0, 10).map((buyer, idx) => {
                  const metricValue = (buyer as any)[sortMetric] ?? 0
                  const maxVal = (sortedBuyers[0] as any)?.[sortMetric] ?? 1
                  const pct = maxVal > 0 ? (metricValue / maxVal) * 100 : 0
                  const isPercentMetric = ['deliveryRate', 'conversionRate', 'capUtilization'].includes(sortMetric)
                  return (
                    <div key={buyer._id} className="flex items-center gap-3 text-sm">
                      <span className="w-5 text-xs text-muted-foreground font-medium">{idx + 1}</span>
                      <span className="w-32 truncate font-medium">{buyer.name}</span>
                      <div className="flex-1 h-5 rounded-md bg-muted overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-md transition-all',
                            idx === 0 ? 'bg-emerald-500' : idx < 3 ? 'bg-blue-500' : 'bg-primary'
                          )}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                      <span className="w-20 text-right text-xs text-muted-foreground font-medium">
                        {isPercentMetric ? `${metricValue.toFixed(1)}%` : formatNumber(metricValue)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">Delivery Heatmap (Hourly Activity)</p>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-[40px_repeat(24,minmax(24px,1fr))] gap-0.5 min-w-[640px]">
                  <div className="text-[9px] text-muted-foreground" />
                  {HOURS.map((h) => (
                    <div key={h} className="text-[9px] text-muted-foreground text-center">{h}</div>
                  ))}
                  {DAYS.map((day, di) => (
                    <>
                      <div key={day} className="text-[9px] text-muted-foreground flex items-center">{day}</div>
                      {HOURS.map((h) => {
                        const key = `${di}-${h}`
                        const value = heatmap.get(key) || 0
                        const intensity = maxHeatValue > 0 ? value / maxHeatValue : 0
                        return (
                          <div
                            key={`${di}-${h}`}
                            className="rounded-sm"
                            style={{
                              aspectRatio: '1',
                              backgroundColor: `rgba(59, 130, 246, ${Math.max(intensity, 0.05)})`,
                            }}
                            title={`${day} ${h}:00 - ${value} deliveries`}
                          />
                        )
                      })}
                    </>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
