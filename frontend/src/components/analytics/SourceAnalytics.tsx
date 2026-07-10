import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
// import {
//   BarChart, Bar, PieChart, Pie, Cell,
//   XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
//   Legend,
// } from 'recharts'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { formatNumber } from '@/lib/utils'
import type { SourceBreakdown } from '@/types'

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1']

const PERIOD_OPTIONS = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
]

const VIEW_OPTIONS = [
  { label: 'Bar Chart', value: 'bar' },
  { label: 'Donut Chart', value: 'donut' },
  { label: 'Combined', value: 'combined' },
]

export function SourceAnalytics() {
  const [period, setPeriod] = useState('30d')
  const [view, setView] = useState('combined')

  const { data, isLoading, error } = useQuery<{ success: boolean; sources: SourceBreakdown[] }>({
    queryKey: [...QUERY_KEYS.SOURCE_BREAKDOWN, period],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/leads/sources?period=${period}`)
      return data
    },
  })

  const sources = data?.sources || []
  const errorMessage = error instanceof Error ? error.message : null

  const sortedByCount = [...sources].sort((a, b) => b.count - a.count)
  const total = sources.reduce((s, src) => s + src.count, 0)
  const avgConvRate = sources.length > 0
    ? sources.reduce((s, src) => s + src.rate, 0) / sources.length
    : 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Source Analytics</CardTitle>
          <div className="flex items-center gap-2">
            <Select
              options={VIEW_OPTIONS}
              value={view}
              onChange={(e) => setView(e.target.value)}
              className="h-8 w-[130px] text-xs"
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
      <CardContent>
        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <p className="font-medium">Source analytics unavailable</p>
            <p className="mt-1">{errorMessage}</p>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total Sources</p>
            <p className="text-lg font-semibold mt-0.5">{sources.length}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total Leads</p>
            <p className="text-lg font-semibold mt-0.5 text-blue-600 dark:text-blue-400">{formatNumber(total)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Avg Conversion Rate</p>
            <p className="text-lg font-semibold mt-0.5 text-emerald-600 dark:text-emerald-400">{avgConvRate.toFixed(1)}%</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-72 text-sm text-muted-foreground">Loading sources...</div>
        ) : sources.length === 0 ? (
          <div className="flex items-center justify-center h-72 text-sm text-muted-foreground">No source data available</div>
        ) : (
          <div className={`grid ${view === 'combined' ? 'grid-cols-5' : 'grid-cols-1'} gap-6`}>
            {(view === 'bar' || view === 'combined') && (
              <div className={view === 'combined' ? 'col-span-3' : ''}>
                <p className="text-xs font-medium text-muted-foreground mb-3">Leads by Source</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={sortedByCount} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="source"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => v.replace(/_/g, ' ')}
                    />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        background: 'hsl(var(--card))',
                        fontSize: '13px',
                      }}
                      formatter={(value: any, name: any) => [formatNumber(value), name === 'count' ? 'Leads' : 'Converted']}
                    />
                    <Legend />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Leads" />
                    <Bar dataKey="converted" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Converted" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {(view === 'donut' || view === 'combined') && (
              <div className={view === 'combined' ? 'col-span-2' : ''}>
                <p className="text-xs font-medium text-muted-foreground mb-3">Source Distribution</p>
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={sortedByCount}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="count"
                      >
                        {sortedByCount.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid hsl(var(--border))',
                          background: 'hsl(var(--card))',
                          fontSize: '13px',
                        }}
                        formatter={(value: any) => [formatNumber(value), 'Leads']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 w-full">
                    {sortedByCount.map((src, idx) => (
                      <div key={src.source} className="flex items-center gap-2 text-xs">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span className="truncate capitalize">{src.source.replace(/_/g, ' ')}</span>
                        <span className="ml-auto text-muted-foreground">{((src.count / total) * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
