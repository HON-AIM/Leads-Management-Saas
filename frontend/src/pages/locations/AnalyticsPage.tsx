import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNumber, formatPercentage } from '@/lib/utils'
import type { GeoAnalytics } from '@/types/location'

const barColor = (range: string) => {
  if (range.startsWith('90') || range.startsWith('80')) return 'bg-emerald-500'
  if (range.startsWith('70') || range.startsWith('60')) return 'bg-amber-500'
  return 'bg-red-500'
}

export function AnalyticsPage() {
  const { data, isLoading } = useQuery<{ success: boolean; data: GeoAnalytics }>({
    queryKey: QUERY_KEYS.LOCATION_ANALYTICS,
    queryFn: async () => {
      const { data } = await api.get('/locations/analytics')
      return data
    },
  })

  const analytics = data?.data

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading analytics...</div>
  }

  if (!analytics) {
    return <div className="text-sm text-muted-foreground">No analytics data available.</div>
  }

  const { summary, topCountries, topRegions, normalizationQuality } = analytics

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Countries</p>
          <p className="text-2xl font-semibold mt-1">{formatNumber(summary.totalCountries)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Regions</p>
          <p className="text-2xl font-semibold mt-1">{formatNumber(summary.totalRegions)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Territories</p>
          <p className="text-2xl font-semibold mt-1">{formatNumber(summary.totalTerritories)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Leads Located</p>
          <p className="text-2xl font-semibold mt-1">{formatNumber(summary.totalLeadsWithLocation)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Avg Confidence</p>
          <p className="text-2xl font-semibold mt-1">{formatPercentage(summary.avgConfidence * 100)}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top Countries</CardTitle>
          </CardHeader>
          <CardContent>
            {!topCountries.length ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              <div className="space-y-3">
                {topCountries.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate">{c.name}</span>
                        <span className="text-muted-foreground">{formatNumber(c.leads)} ({formatPercentage(c.percentage)})</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{ width: `${c.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top Regions</CardTitle>
          </CardHeader>
          <CardContent>
            {!topRegions.length ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              <div className="space-y-3">
                {topRegions.slice(0, 10).map((r, i) => (
                  <div key={r.name + r.country} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground">{i + 1}.</span>
                      <span className="font-medium truncate">{r.name}</span>
                      <span className="text-xs text-muted-foreground truncate">{r.country}</span>
                    </div>
                    <span className="text-muted-foreground shrink-0">{formatNumber(r.leads)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Normalization Quality Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {!normalizationQuality.length ? (
            <p className="text-sm text-muted-foreground">No data</p>
          ) : (
            <div className="space-y-2">
              <div className="flex h-8 w-full rounded-full overflow-hidden">
                {normalizationQuality.map((nq) => (
                  <div
                    key={nq.range}
                    className={barColor(nq.range)}
                    style={{ width: `${nq.count}%` }}
                    title={`${nq.range}: ${nq.count}%`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {normalizationQuality.map((nq) => (
                  <div key={nq.range} className="flex items-center gap-1">
                    <span className={`inline-block h-2 w-2 rounded-full ${barColor(nq.range)}`} />
                    {nq.range}: {nq.count}%
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
