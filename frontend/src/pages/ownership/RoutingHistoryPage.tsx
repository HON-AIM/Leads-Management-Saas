import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useSocket } from '@/hooks/useSocket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RoutingTimeline } from '@/components/ownership/RoutingTimeline'
import type { RoutingHistoryResponse, RoutingSummary } from '@/types/ownership'

export function RoutingHistoryPage() {
  const [leadId, setLeadId] = useState('')
  const [searchedId, setSearchedId] = useState('')
  const [eventFilter, setEventFilter] = useState('')

  const { data, isLoading } = useQuery<RoutingHistoryResponse>({
    queryKey: ['routing-history', searchedId],
    queryFn: async () => {
      const { data } = await api.get(`/leads/${searchedId}/history`)
      return data
    },
    enabled: !!searchedId,
  })

  const history = data?.history || []
  const summary = data?.summary

  const queryClient = useQueryClient()
  const { subscribe } = useSocket()

  const filtered = eventFilter
    ? history.filter((e) => e.eventType === eventFilter)
    : history

  useEffect(() => {
    if (!searchedId) return

    const unsubscribe = subscribe('routing_event', () => {
      queryClient.invalidateQueries({ queryKey: ['routing-history', searchedId] })
    })

    return () => unsubscribe()
  }, [searchedId, queryClient, subscribe])

  const handleSearch = () => {
    if (leadId.trim()) {
      setSearchedId(leadId.trim())
      setEventFilter('')
    }
  }

  const eventTypes = [...new Set(history.map((e) => e.eventType))]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Routing History Timeline</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Trace every assignment, reassignment, and routing decision
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search Lead</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
              placeholder="Enter Lead ID..."
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
            />
            <Button onClick={handleSearch} disabled={!leadId.trim()}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{summary.totalEvents}</p>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">{summary.assignments}</p>
              <p className="text-xs text-muted-foreground">Assignments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-amber-500 dark:text-amber-400">{summary.reassignments}</p>
              <p className="text-xs text-muted-foreground">Reassignments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-red-500 dark:text-red-400">{summary.failures}</p>
              <p className="text-xs text-muted-foreground">Failures</p>
            </CardContent>
          </Card>
        </div>
      )}

      {searchedId && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Timeline</CardTitle>
              {eventTypes.length > 1 && (
                <select
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                  className="rounded-lg border bg-background px-2 py-1 text-xs text-foreground outline-none"
                >
                  <option value="">All Events</option>
                  {eventTypes.map((type) => (
                    <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}
              </div>
            ) : (
              <RoutingTimeline events={filtered} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
