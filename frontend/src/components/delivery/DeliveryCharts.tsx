import { useMemo } from 'react'
import { formatNumber } from '@/lib/utils'
import type { DeliveryTrend, DeliveryHourlyTrend } from '@/types/delivery'

interface DeliveryChartsProps {
  trends: DeliveryTrend[]
  hourly: DeliveryHourlyTrend[]
  isLoading: boolean
}

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <span className="text-[10px] text-muted-foreground">{formatNumber(value)}</span>
      <div className="w-full h-16 rounded-md bg-white/[0.05] overflow-hidden flex flex-col-reverse">
        <div className={`${color} rounded-t-sm transition-all`} style={{ height: `${Math.max(pct, 2)}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground truncate w-full text-center">{label}</span>
    </div>
  )
}

export function DeliveryCharts({ trends, hourly, isLoading }: DeliveryChartsProps) {
  const maxTrend = useMemo(() => Math.max(...trends.map((t) => t.total), 1), [trends])
  const avgDuration = useMemo(() => {
    if (hourly.length === 0) return 0
    return hourly.reduce((s, h) => s + h.avgDuration, 0) / hourly.length
  }, [hourly])

  const successRate = useMemo(() => {
    if (trends.length === 0) return 0
    const total = trends.reduce((s, t) => s + t.total, 0)
    const success = trends.reduce((s, t) => s + t.success, 0)
    return total > 0 ? (success / total) * 100 : 0
  }, [trends])

  if (isLoading) {
    return <div className="h-[200px] skeleton bg-white/[0.05] rounded-lg" />
  }

  if (trends.length === 0) {
    return <div className="text-[12px] text-muted-foreground py-12 text-center">No delivery data available</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
          <p className="text-[11px] text-muted-foreground">Avg Duration</p>
          <p className="text-[16px] font-semibold text-white mt-1">{formatNumber(Math.round(avgDuration))}ms</p>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
          <p className="text-[11px] text-muted-foreground">Success Rate</p>
          <p className="text-[16px] font-semibold text-emerald-400 mt-1">{successRate.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
          <p className="text-[11px] text-muted-foreground">Total</p>
          <p className="text-[16px] font-semibold text-white mt-1">{formatNumber(trends.reduce((s, t) => s + t.total, 0))}</p>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
          <p className="text-[11px] text-muted-foreground">Failed</p>
          <p className="text-[16px] font-semibold text-red-400 mt-1">{formatNumber(trends.reduce((s, t) => s + t.failed, 0))}</p>
        </div>
      </div>

      <div>
        <h4 className="text-[12px] font-medium text-white/80 mb-3">Daily Delivery Trends</h4>
        <div className="flex items-end gap-1 h-32">
          {trends.map((t) => (
            <div key={t._id} className="flex-1 flex flex-col-reverse h-full gap-0.5">
              {t.failed > 0 && (
                <div className="bg-red-500/60 rounded-t-sm transition-all" style={{ height: `${(t.failed / maxTrend) * 100}%` }} />
              )}
              {t.success > 0 && (
                <div className="bg-emerald-500/60 rounded-t-sm transition-all" style={{ height: `${(t.success / maxTrend) * 100}%` }} />
              )}
              {t.retrying > 0 && (
                <div className="bg-amber-500/60 rounded-t-sm transition-all" style={{ height: `${(t.retrying / maxTrend) * 100}%` }} />
              )}
              <span className="text-[9px] text-muted-foreground text-center pt-1 -mb-5">{t._id.slice(5)}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-6 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-emerald-500" /> Success</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-red-500" /> Failed</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-amber-500" /> Retrying</span>
        </div>
      </div>

      <div>
        <h4 className="text-[12px] font-medium text-white/80 mb-3">Response Times (Hourly Avg)</h4>
        <div className="flex items-end gap-1 h-32">
          {hourly.slice(-48).map((h) => (
            <Bar
              key={h._id}
              value={Math.round(h.avgDuration)}
              max={Math.round(Math.max(...hourly.map((x) => x.avgDuration), 1))}
              color="bg-blue-500/60"
              label={h._id.slice(-2) + 'h'}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
