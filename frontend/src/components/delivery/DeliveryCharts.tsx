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
  const safeTrends = Array.isArray(trends) ? trends : []
  const safeHourly = Array.isArray(hourly) ? hourly : []

  const maxTrend = useMemo(
    () => Math.max(...safeTrends.map((t) => t.total ?? 0), 1),
    [safeTrends]
  )

  const successRate = useMemo(() => {
    if (safeTrends.length === 0) return 0
    const total = safeTrends.reduce((s, t) => s + (t.total ?? 0), 0)
    const delivered = safeTrends.reduce((s, t) => s + (t.delivered ?? 0), 0)
    return total > 0 ? (delivered / total) * 100 : 0
  }, [safeTrends])

  if (isLoading) {
    return <div className="h-[200px] skeleton bg-white/[0.05] rounded-lg" />
  }

  if (safeTrends.length === 0 && safeHourly.length === 0) {
    return <div className="text-[12px] text-muted-foreground py-12 text-center">No delivery data available</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
          <p className="text-[11px] text-muted-foreground">Pending</p>
          <p className="text-[16px] font-semibold text-amber-400 mt-1">{formatNumber(safeTrends.reduce((s, t) => s + (t.pending ?? 0), 0))}</p>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
          <p className="text-[11px] text-muted-foreground">Success Rate</p>
          <p className="text-[16px] font-semibold text-emerald-400 mt-1">{successRate.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
          <p className="text-[11px] text-muted-foreground">Total</p>
          <p className="text-[16px] font-semibold text-white mt-1">{formatNumber(safeTrends.reduce((s, t) => s + (t.total ?? 0), 0))}</p>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
          <p className="text-[11px] text-muted-foreground">Failed</p>
          <p className="text-[16px] font-semibold text-red-400 mt-1">{formatNumber(safeTrends.reduce((s, t) => s + (t.failed ?? 0), 0))}</p>
        </div>
      </div>

      <div>
        <h4 className="text-[12px] font-medium text-white/80 mb-3">Daily Delivery Trends</h4>
        {safeTrends.length === 0 ? (
          <div className="text-[12px] text-muted-foreground py-8 text-center">No daily trend data</div>
        ) : (
          <div className="flex items-end gap-1 h-32">
            {safeTrends.map((t) => (
              <div key={t.date} className="flex-1 flex flex-col-reverse h-full gap-0.5">
                {t.failed > 0 && (
                  <div className="bg-red-500/60 rounded-t-sm transition-all" style={{ height: `${(t.failed / maxTrend) * 100}%` }} />
                )}
                {t.delivered > 0 && (
                  <div className="bg-emerald-500/60 rounded-t-sm transition-all" style={{ height: `${(t.delivered / maxTrend) * 100}%` }} />
                )}
                {t.pending > 0 && (
                  <div className="bg-amber-500/60 rounded-t-sm transition-all" style={{ height: `${(t.pending / maxTrend) * 100}%` }} />
                )}
                <span className="text-[9px] text-muted-foreground text-center pt-1 -mb-5">{(t.date ?? '').slice(5)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-4 mt-6 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-emerald-500" /> Delivered</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-red-500" /> Failed</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-amber-500" /> Pending</span>
        </div>
      </div>

      <div>
        <h4 className="text-[12px] font-medium text-white/80 mb-3">Delivery Volume (Hourly)</h4>
        {safeHourly.length === 0 ? (
          <div className="text-[12px] text-muted-foreground py-8 text-center">No hourly activity</div>
        ) : (
          <div className="flex items-end gap-1 h-32">
            {safeHourly.slice(-48).map((h) => (
              <Bar
                key={h.hour}
                value={h.total ?? 0}
                max={Math.max(...safeHourly.map((x) => x.total ?? 0), 1)}
                color="bg-blue-500/60"
                label={(h.hour ?? '').slice(11, 13) + 'h'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}