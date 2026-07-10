import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
// import {
//   LineChart, Line, AreaChart, Area, BarChart, Bar,
//   XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
//   Legend,
// } from 'recharts'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { formatNumber } from '@/lib/utils'
import type { TrendDataPoint, TrendSummary } from '@/types'

const CHART_COLORS = {
  leads: '#3b82f6',
  deliveries: '#10b981',
  conversions: '#8b5cf6',
  failed: '#ef4444',
}

const GRANULARITY_OPTIONS = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
]

const PERIOD_OPTIONS = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
]

const METRIC_OPTIONS = [
  { label: 'All Metrics', value: 'all' },
  { label: 'Leads', value: 'leads' },
  { label: 'Deliveries', value: 'deliveries' },
  { label: 'Conversions', value: 'conversions' },
]

export function TrendCharts() {
  const [granularity, setGranularity] = useState('daily')
  const [period, setPeriod] = useState('30d')
  const [metric, setMetric] = useState('all')
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area')

  const { data: trendData, isLoading, error: trendError } = useQuery<{ success: boolean; trend: TrendDataPoint[] }>({
    queryKey: [...QUERY_KEYS.TRENDS, granularity, period],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/trends/full?granularity=${granularity}&period=${period}`)
      return data
    },
  })

  const { data: summaryData, error: summaryError } = useQuery<{ success: boolean } & TrendSummary>({
    queryKey: [...QUERY_KEYS.TREND_SUMMARY, period],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/leads/period-comparison?period=${period}`)
      return data
    },
  })

  const trends = trendData?.trend || []
  const errorMessage = trendError instanceof Error ? trendError.message : summaryError instanceof Error ? summaryError.message : null

  const summaryCards = useMemo(() => {
    if (!summaryData) return []
    return [
      { label: 'Total Leads', value: summaryData.totalLeads ?? 0, color: 'text-blue-600 dark:text-blue-400', change: summaryData.leadGrowth },
      { label: 'Conversions', value: summaryData.totalConversions ?? 0, color: 'text-violet-600 dark:text-violet-400', change: summaryData.conversionGrowth },
      { label: 'Conversion Rate', value: `${((summaryData.conversionRate ?? 0)).toFixed(1)}%`, color: 'text-emerald-600 dark:text-emerald-400', change: null },
      { label: 'Failed', value: summaryData.totalFailed ?? 0, color: 'text-red-600 dark:text-red-400', change: null },
    ]
  }, [summaryData])

  const ChartComponent = chartType === 'area' ? AreaChart : chartType === 'line' ? LineChart : BarChart
  const DataComponent = chartType === 'area' ? Area : chartType === 'line' ? Line : Bar

  const renderChart = () => {
    const commonProps = {
      data: trends,
      margin: { top: 5, right: 10, left: 0, bottom: 5 },
    }

    return (
      <ResponsiveContainer width="100%" height={320}>
        <ChartComponent {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => {
              if (granularity === 'monthly') return v.slice(0, 7)
              if (granularity === 'weekly') return v.slice(5)
              return v.slice(5)
            }}
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
          {(metric === 'all' || metric === 'leads') && (
            <DataComponent
              type="monotone"
              dataKey="leads"
              stroke={CHART_COLORS.leads}
              fill={CHART_COLORS.leads}
              fillOpacity={0.1}
              strokeWidth={2}
              dot={false}
              name="Leads"
            />
          )}
          {(metric === 'all' || metric === 'deliveries') && (
            <DataComponent
              type="monotone"
              dataKey="deliveries"
              stroke={CHART_COLORS.deliveries}
              fill={CHART_COLORS.deliveries}
              fillOpacity={0.1}
              strokeWidth={2}
              dot={false}
              name="Deliveries"
            />
          )}
          {(metric === 'all' || metric === 'conversions') && (
            <DataComponent
              type="monotone"
              dataKey="conversions"
              stroke={CHART_COLORS.conversions}
              fill={CHART_COLORS.conversions}
              fillOpacity={0.1}
              strokeWidth={2}
              dot={false}
              name="Conversions"
            />
          )}
          {metric === 'all' && (
            <DataComponent
              type="monotone"
              dataKey="failed"
              stroke={CHART_COLORS.failed}
              fill={CHART_COLORS.failed}
              fillOpacity={0.1}
              strokeWidth={2}
              dot={false}
              name="Failed"
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Trend Analysis</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              options={METRIC_OPTIONS}
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="h-8 w-[130px] text-xs"
            />
            <Select
              options={GRANULARITY_OPTIONS}
              value={granularity}
              onChange={(e) => setGranularity(e.target.value)}
              className="h-8 w-[110px] text-xs"
            />
            <Select
              options={PERIOD_OPTIONS}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-8 w-[130px] text-xs"
            />
            <div className="flex rounded-md border">
              {(['area', 'line', 'bar'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setChartType(t)}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                    chartType === t
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  } ${t === 'area' ? 'rounded-l-md' : ''} ${t === 'bar' ? 'rounded-r-md' : ''}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <p className="font-medium">Trend analytics unavailable</p>
            <p className="mt-1">{errorMessage}</p>
          </div>
        )}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className={`text-lg font-semibold mt-0.5 ${card.color}`}>{card.value}</p>
              {card.change != null && (
                <p className={`text-[10px] mt-0.5 ${card.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {card.change >= 0 ? '+' : ''}{card.change.toFixed(1)}%
                </p>
              )}
            </div>
          ))}
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-80 text-sm text-muted-foreground">Loading trends...</div>
        ) : trends.length === 0 ? (
          <div className="flex items-center justify-center h-80 text-sm text-muted-foreground">No trend data available</div>
        ) : (
          renderChart()
        )}
      </CardContent>
    </Card>
  )
}
