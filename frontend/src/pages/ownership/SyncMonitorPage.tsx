import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useSocket } from '@/hooks/useSocket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SyncStatusBadge } from '@/components/ownership/SyncStatusBadge'
import type { CrmSyncLog } from '@/types/ownership'

export function SyncMonitorPage() {
  const [platformFilter, setPlatformFilter] = useState('')
  const queryClient = useQueryClient()

  const queryParams = new URLSearchParams()
  if (platformFilter) queryParams.set('platform', platformFilter)

  const { data, isLoading } = useQuery({
    queryKey: ['sync-logs', platformFilter],
    queryFn: async () => {
      const { data } = await api.get(`/sync/logs?limit=100&${queryParams.toString()}`)
      return data as { success: boolean; logs: CrmSyncLog[] }
    },
  })

  const retryMutation = useMutation({
    mutationFn: async (logId: string) => {
      const { data } = await api.post(`/sync/retry/${logId}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] })
    },
  })

  const logs = data?.logs || []

  const { subscribe } = useSocket()

  useEffect(() => {
    const unsubscribe = subscribe('crm_sync_update', () => {
      queryClient.invalidateQueries({ queryKey: ['sync-logs', platformFilter] })
    })

    return () => unsubscribe()
  }, [platformFilter, queryClient, subscribe])

  const stats = {
    total: logs.length,
    success: logs.filter((l) => l.success).length,
    failed: logs.filter((l) => !l.success).length,
    retrying: logs.filter((l) => !l.success && l.retryCount > 0 && l.retryCount < l.maxRetries).length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CRM Sync Monitor</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor GHL syncs, webhook deliveries, and retry status
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Syncs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">{stats.success}</p>
            <p className="text-xs text-muted-foreground">Successful</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-amber-500 dark:text-amber-400">{stats.retrying}</p>
            <p className="text-xs text-muted-foreground">Retrying</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-red-500 dark:text-red-400">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Sync Logs</CardTitle>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="rounded-lg border bg-background px-2 py-1 text-xs text-foreground outline-none"
            >
              <option value="">All Platforms</option>
              <option value="GHL">GHL</option>
              <option value="webhook">Webhook</option>
              <option value="email">Email</option>
              <option value="facebook">Facebook</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50 mb-2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              <p className="text-sm text-muted-foreground">No sync logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-medium">Lead</th>
                    <th className="px-4 py-2.5 text-left font-medium">Platform</th>
                    <th className="px-4 py-2.5 text-left font-medium">Status</th>
                    <th className="px-4 py-2.5 text-left font-medium">Attempts</th>
                    <th className="px-4 py-2.5 text-left font-medium">Last Sync</th>
                    <th className="px-4 py-2.5 text-left font-medium">Response Time</th>
                    <th className="px-4 py-2.5 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5">
                        {typeof log.leadId === 'object' ? (
                          <div>
                            <p className="font-medium text-sm">{(log.leadId as { name: string }).name}</p>
                            <p className="text-[11px] text-muted-foreground">{(log.leadId as { email: string }).email}</p>
                          </div>
                        ) : (
                          <span className="font-mono text-xs">{log.leadId}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-medium capitalize">{log.platform}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <SyncStatusBadge status={log.success} retryCount={log.retryCount} maxRetries={log.maxRetries} />
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {log.retryCount}/{log.maxRetries}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {log.syncedAt ? new Date(log.syncedAt).toLocaleString() : log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {log.duration !== null ? `${log.duration}ms` : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {!log.success && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => retryMutation.mutate(log._id)}
                            disabled={retryMutation.isPending}
                            className="text-[11px] h-7 px-2"
                          >
                            Retry
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
