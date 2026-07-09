import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { cn, formatNumber } from '@/lib/utils'
import type { FinancialOverview, DailyPnLRow, FinancialReportRow } from '@/types/financial'

const PERIOD_OPTIONS = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
]

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function DeltaBadge({ value, invert = false }: { value: number; invert?: boolean }) {
  if (value === 0) return null
  const positive = invert ? value < 0 : value > 0
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
      positive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
    )}>
      {value > 0 ? '↑' : '↓'} {Math.abs(value).toFixed(1)}%
    </span>
  )
}

const PNL_CARDS = [
  { key: 'revenue', label: 'Revenue', format: 'currency', deltaKey: 'revenue' as const, color: 'text-emerald-600' },
  { key: 'cost', label: 'Cost', format: 'currency', deltaKey: 'cost' as const, color: 'text-red-500', invertDelta: true },
  { key: 'profit', label: 'Profit', format: 'currency', deltaKey: 'profit' as const, color: 'text-blue-600' },
  { key: 'profitMargin', label: 'Profit Margin', format: 'percent', deltaKey: 'profitMargin' as const, color: 'text-violet-600' },
]

export function FinancialOverviewPanel() {
  const [period, setPeriod] = useState('7d')

  const { data: overview } = useQuery<FinancialOverview>({
    queryKey: ['financial-overview', period],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/financial/overview?period=${period}`)
      return data
    },
    refetchInterval: 60_000,
  })

  const { data: dailyData } = useQuery<DailyPnLRow[]>({
    queryKey: ['financial-daily', period],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/financial/daily?period=${period}`)
      return data.daily || []
    },
    refetchInterval: 60_000,
  })

  const { data: reportData } = useQuery<FinancialReportRow[]>({
    queryKey: ['financial-report', period],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/financial/report?period=${period}&granularity=weekly`)
      return data.report || []
    },
    refetchInterval: 60_000,
  })

  const current = overview?.current
  const deltas = overview?.deltas
  const daily = dailyData || []
  const report = reportData || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Profit & Loss</h2>
          <p className="text-xs text-muted-foreground">Real-time financial performance across campaigns</p>
        </div>
        <Select
          options={PERIOD_OPTIONS}
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="h-8 w-[140px] text-xs"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PNL_CARDS.map((card) => {
          const value = (current as any)?.[card.key] ?? 0
          const delta = deltas?.[card.deltaKey] ?? 0
          return (
            <Card key={card.key}>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">{card.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <p className={cn('text-2xl font-bold', card.color)}>
                    {card.format === 'currency' ? formatCurrency(value) : `${value.toFixed(1)}%`}
                  </p>
                  <DeltaBadge value={delta} invert={(card as any).invertDelta} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">vs previous period</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Daily Profit & Loss</CardTitle>
          </CardHeader>
          <CardContent>
            {daily.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No financial data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="profit" stroke="#3b82f6" fill="#3b82f640" name="Profit" />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b98120" name="Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Lead Volume & CPL</CardTitle>
          </CardHeader>
          <CardContent>
            {daily.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No volume data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="accepted" fill="#8b5cf6" name="Accepted" radius={[2, 2, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="cpl" stroke="#f59e0b" strokeWidth={2} name="CPL" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Financial Performance Report</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {report.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No report data</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left font-medium px-4 py-2">Period</th>
                  <th className="text-right font-medium px-3 py-2">Leads</th>
                  <th className="text-right font-medium px-3 py-2">CPL</th>
                  <th className="text-right font-medium px-3 py-2">Accept %</th>
                  <th className="text-right font-medium px-3 py-2">Revenue</th>
                  <th className="text-right font-medium px-3 py-2">Cost</th>
                  <th className="text-right font-medium px-3 py-2">Profit</th>
                  <th className="text-right font-medium px-3 py-2">Margin</th>
                  <th className="text-right font-medium px-4 py-2">ROI</th>
                </tr>
              </thead>
              <tbody>
                {report.map((row) => (
                  <tr key={row.period} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">{row.period}</td>
                    <td className="text-right px-3 py-2">{formatNumber(row.leads)}</td>
                    <td className="text-right px-3 py-2">{formatCurrency(row.cpl)}</td>
                    <td className="text-right px-3 py-2">{row.acceptRate.toFixed(1)}%</td>
                    <td className="text-right px-3 py-2 text-emerald-600">{formatCurrency(row.revenue)}</td>
                    <td className="text-right px-3 py-2 text-red-500">{formatCurrency(row.cost)}</td>
                    <td className="text-right px-3 py-2 font-medium">{formatCurrency(row.profit)}</td>
                    <td className="text-right px-3 py-2">{row.profitMargin.toFixed(1)}%</td>
                    <td className="text-right px-4 py-2">{row.roi.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
