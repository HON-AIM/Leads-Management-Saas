import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AuditTable } from '@/components/ownership/AuditTable'
import type { AuditEvent } from '@/types/ownership'

export function AuditDashboardPage() {
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const [buyerFilter, setBuyerFilter] = useState('')

  const queryParams = new URLSearchParams()
  if (eventTypeFilter) queryParams.set('eventType', eventTypeFilter)
  if (buyerFilter) queryParams.set('buyerId', buyerFilter)

  const { data, isLoading } = useQuery({
    queryKey: ['audit-ownership', eventTypeFilter, buyerFilter],
    queryFn: async () => {
      const { data } = await api.get(`/audit/ownership?limit=200&${queryParams.toString()}`)
      return data as { success: boolean; audit: AuditEvent[] }
    },
  })

  const audit = data?.audit || []

  const eventCounts = audit.reduce<Record<string, number>>((acc, e) => {
    acc[e.eventType] = (acc[e.eventType] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enterprise ownership audit trail with assignment analytics
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{audit.length}</p>
            <p className="text-xs text-muted-foreground">Total Events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">{eventCounts['ownership_assigned'] || 0}</p>
            <p className="text-xs text-muted-foreground">Assignments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-amber-500 dark:text-amber-400">{(eventCounts['reassigned'] || 0) + (eventCounts['ownership_transferred'] || 0)}</p>
            <p className="text-xs text-muted-foreground">Transfers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-blue-500 dark:text-blue-400">{eventCounts['ownership_locked'] || 0}</p>
            <p className="text-xs text-muted-foreground">Locks</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Event Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(eventCounts).map(([type, count]) => {
                const total = audit.length || 1
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="capitalize text-foreground">{type.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-foreground">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Audit Trail</CardTitle>
              <div className="flex items-center gap-2">
                <select
                  value={eventTypeFilter}
                  onChange={(e) => setEventTypeFilter(e.target.value)}
                  className="rounded-lg border bg-background px-2 py-1 text-xs text-foreground outline-none"
                >
                  <option value="">All Events</option>
                  <option value="ownership_assigned">Assigned</option>
                  <option value="ownership_transferred">Transferred</option>
                  <option value="ownership_locked">Locked</option>
                  <option value="ownership_unlocked">Unlocked</option>
                  <option value="reassigned">Reassigned</option>
                  <option value="manual_override">Manual Override</option>
                </select>
                <input
                  type="text"
                  value={buyerFilter}
                  onChange={(e) => setBuyerFilter(e.target.value)}
                  placeholder="Buyer ID..."
                  className="w-28 rounded-lg border bg-background px-2 py-1 text-xs outline-none"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <AuditTable audit={audit} loading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
