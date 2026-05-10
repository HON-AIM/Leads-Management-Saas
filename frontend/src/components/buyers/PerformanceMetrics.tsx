import { formatNumber, formatPercentage } from '@/lib/utils'
import type { BuyerStats } from '@/types'

interface PerformanceMetricsProps {
  stats: BuyerStats
}

export function PerformanceMetrics({ stats }: PerformanceMetricsProps) {
  const dailyPercent = stats.dailyCap > 0 ? (stats.dailyUsage / stats.dailyCap) * 100 : 0
  const monthlyPercent = stats.monthlyCap > 0 ? (stats.monthlyUsage / stats.monthlyCap) * 100 : 0
  const totalPercent = stats.leadCap > 0 ? (stats.totalLeads / stats.leadCap) * 100 : 0

  const metricColor = (pct: number) =>
    pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : pct >= 50 ? 'bg-blue-500' : 'bg-emerald-500'

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Performance Metrics</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Delivery Rate</p>
          <p className="text-2xl font-semibold mt-1">{formatPercentage(stats.deliveryRate)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Total Leads</p>
          <p className="text-2xl font-semibold mt-1">{formatNumber(stats.totalLeads)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Delivered</p>
          <p className="text-2xl font-semibold mt-1 text-emerald-600 dark:text-emerald-400">{formatNumber(stats.deliveredLeads)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Failed</p>
          <p className="text-2xl font-semibold mt-1 text-red-600 dark:text-red-400">{formatNumber(stats.failedLeads)}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Total Cap</span>
            <span className="font-medium">{formatNumber(stats.totalLeads)} / {formatNumber(stats.leadCap)}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${metricColor(totalPercent)}`}
              style={{ width: `${Math.min(totalPercent, 100)}%` }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Daily Cap</span>
            <span className="font-medium">{formatNumber(stats.dailyUsage)} / {formatNumber(stats.dailyCap)}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${metricColor(dailyPercent)}`}
              style={{ width: `${Math.min(dailyPercent, 100)}%` }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Monthly Cap</span>
            <span className="font-medium">{formatNumber(stats.monthlyUsage)} / {formatNumber(stats.monthlyCap)}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${metricColor(monthlyPercent)}`}
              style={{ width: `${Math.min(monthlyPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
