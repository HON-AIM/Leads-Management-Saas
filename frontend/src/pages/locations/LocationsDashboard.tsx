import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LocationAIWidget } from '@/components/locations/LocationAIWidget'
import { AmbiguousLeadQueue } from '@/components/locations/AmbiguousLeadQueue'
import { formatNumber } from '@/lib/utils'
import type { GeoAnalytics } from '@/types/location'

export function LocationsDashboard() {
  const { data, isLoading } = useQuery<{ success: boolean; data: GeoAnalytics }>({
    queryKey: QUERY_KEYS.LOCATION_STATS,
    queryFn: async () => {
      const { data } = await api.get('/locations/stats')
      return data
    },
  })

  const stats = data?.data?.summary

  const statCards = [
    { label: 'Countries', value: stats?.totalCountries ?? 0, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Regions', value: stats?.totalRegions ?? 0, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Territories', value: stats?.totalTerritories ?? 0, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Leads Located', value: stats?.totalLeadsWithLocation ?? 0, color: 'text-purple-600 dark:text-purple-400' },
    { label: 'Ambiguous', value: stats?.totalAmbiguousLeads ?? 0, color: 'text-red-600 dark:text-red-400' },
    { label: 'Avg Confidence', value: stats?.avgConfidence ? `${(stats.avgConfidence * 100).toFixed(0)}%` : '--', color: 'text-cyan-600 dark:text-cyan-400' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-semibold mt-1 ${stat.color}`}>
                {isLoading ? '...' : formatNumber(stat.value as number) ?? stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Normalization Activity</CardTitle>
              <Button variant="outline" size="sm" className="text-xs">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <p className="font-medium">Run #{1000 + i}</p>
                    <p className="text-xs text-muted-foreground">Processed 1,{200 + i * 100} leads</p>
                  </div>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">Completed</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ambiguous Leads Queue</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AmbiguousLeadQueue />
          </CardContent>
        </Card>
      </div>

      <LocationAIWidget />
    </div>
  )
}
