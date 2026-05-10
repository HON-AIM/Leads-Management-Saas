import { CAP_COLOR } from '@/types/buyer'
import { formatNumber, formatPercentage } from '@/lib/utils'
import type { BuyerStats as Stats, CapUsage } from '@/types/buyer'

interface BuyerStatsProps {
  stats: Stats | null
  usage: CapUsage | null
  isLoading: boolean
}

export function BuyerStats({ stats, usage, isLoading }: BuyerStatsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Leads</p>
          <p className="text-xl font-semibold mt-1">{formatNumber(stats.totalLeads)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Today</p>
          <p className="text-xl font-semibold mt-1">{formatNumber(stats.leadsToday)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Delivered</p>
          <p className="text-xl font-semibold mt-1 text-emerald-600 dark:text-emerald-400">{formatNumber(stats.deliveredCount)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Failed</p>
          <p className="text-xl font-semibold mt-1 text-red-600 dark:text-red-400">{formatNumber(stats.failedCount)}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground">Delivery Rate</p>
          <p className="text-sm font-semibold">{formatPercentage(stats.deliveryRate)}</p>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${Math.min(stats.deliveryRate, 100)}%` }}
          />
        </div>
      </div>

      {usage && (
        <>
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cap Usage</p>
            <CapBar label="Total" used={usage.total.used} cap={usage.total.cap} percent={usage.total.percent} />
            <CapBar label="Daily" used={usage.daily.used} cap={usage.daily.cap} percent={usage.daily.percent} />
            <CapBar label="Monthly" used={usage.monthly.used} cap={usage.monthly.cap} percent={usage.monthly.percent} />
          </div>
        </>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-xl border bg-card p-3">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          stats.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
          stats.status === 'full' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
          'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
        }`}>
          {stats.status}
        </span>
        {stats.isPaused && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
            Paused
          </span>
        )}
      </div>
    </div>
  )
}

function CapBar({ label, used, cap, percent }: { label: string; used: number; cap: number; percent: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{formatNumber(used)}{cap > 0 ? ` / ${formatNumber(cap)}` : ''}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${CAP_COLOR(percent)}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  )
}
