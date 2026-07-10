import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
// import {
//   PieChart, Pie, Cell, LineChart, Line,
//   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
//   Legend,
// } from 'recharts'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { formatNumber, formatPercentage } from '@/lib/utils'
import type { DeliveryRateData } from '@/types'

const PIE_COLORS = {
  success: '#10b981',
  failed: '#ef4444',
  retrying: '#f59e0b',
  pending: '#6b7280',
}

const PROVIDER_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b']

const PERIOD_OPTIONS = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
]

export function DeliverySuccessRate() {
  const [period, setPeriod] = useState('30d')
  const [chartView, setChartView] = useState<'donut' | 'trend' | 'provider'>('donut')

  const { data: deliveryData, isLoading, error } = useQuery<DeliveryRateData>({
    queryKey: [...QUERY_KEYS.DELIVERY_RATES, period],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/delivery/rates?period=${period}`)
      return data
    },
  })

  const errorMessage = error instanceof Error ? error.message : null

  const pieData = [
    { name: 'Success', value: deliveryData?.success || 0, color: PIE_COLORS.success },
    { name: 'Failed', value: deliveryData?.failed || 0, color: PIE_COLORS.failed },
    { name: 'Retrying', value: deliveryData?.retrying || 0, color: PIE_COLORS.retrying },
    { name: 'Pending', value: deliveryData?.pending || 0, color: PIE_COLORS.pending },
  ].filter((d) => d.value > 0)

  const totalDeliveries = pieData.reduce((s, d) => s + d.value, 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Delivery Success Rate</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border">
              {(['donut', 'trend', 'provider'] as const).map((v, i, arr) => (
                <button
                  key={v}
                  onClick={() => setChartView(v)}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors capitalize ${
                    chartView === v
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  } ${i === 0 ? 'rounded-l-md' : ''} ${i === arr.length - 1 ? 'rounded-r-md' : ''}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <Select
              options={PERIOD_OPTIONS}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-8 w-[130px] text-xs"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <p className="font-medium">Delivery analytics unavailable</p>
            <p className="mt-1">{errorMessage}</p>
          </div>
        )}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Success Rate</p>
            <p className="text-lg font-semibold mt-0.5 text-emerald-600 dark:text-emerald-400">
              {formatPercentage(deliveryData?.successRate ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Successful</p>
            <p className="text-lg font-semibold mt-0.5 text-emerald-600 dark:text-emerald-400">{formatNumber(deliveryData?.success || 0)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-lg font-semibold mt-0.5 text-red-600 dark:text-red-400">{formatNumber(deliveryData?.failed || 0)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-semibold mt-0.5">{formatNumber(totalDeliveries)}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-72 text-sm text-muted-foreground">Loading delivery data...</div>
        ) : totalDeliveries === 0 ? (
          <div className="flex items-center justify-center h-72 text-sm text-muted-foreground">No delivery data available</div>
        ) : chartView === 'donut' ? (
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <ResponsiveContainer width="100%" height={260} className="max-w-[260px]">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                    fontSize: '13px',
                  }}
                  formatter={(value: any) => [formatNumber(value), 'Deliveries']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2.5 w-full max-w-[240px]">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span>{entry.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatNumber(entry.value)} ({((entry.value / totalDeliveries) * 100).toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : chartView === 'trend' ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Success Rate Trend</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={deliveryData?.trend || []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                    fontSize: '13px',
                  }}
                  formatter={(value: any) => [`${typeof value === 'number' ? value.toFixed(1) : value}%`, 'Success Rate']}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Success Rate"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">By Provider</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={deliveryData?.byProvider || []} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="provider" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
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
                <Bar dataKey="success" fill="#10b981" radius={[4, 4, 0, 0]} name="Success" />
                <Bar dataKey="failed" fill="#ef4444" radius={[4, 4, 0, 0]} name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
