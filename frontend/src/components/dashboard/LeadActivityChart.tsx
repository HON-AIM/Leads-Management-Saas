import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface TrendPoint {
  _id: string
  count: number
}

export function LeadActivityChart({ data }: { data: TrendPoint[] }) {
  const chartData = useMemo(() =>
    data.map((d) => ({
      date: new Date(d._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      leads: d.count,
    })),
  [data])

  if (chartData.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <p className="text-[12px] text-muted-foreground">No lead data yet</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'hsl(215,16%,57%)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(215,16%,57%)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: '#0c1021',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#e2e8f0',
            padding: '8px 12px',
          }}
          labelStyle={{ color: 'hsl(215,16%,57%)', fontSize: '11px', marginBottom: '4px' }}
        />
        <Area
          type="monotone"
          dataKey="leads"
          stroke="#3b82f6"
          strokeWidth={1.5}
          fill="url(#leadGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
