import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDate, formatNumber } from '@/lib/utils'
import type { NormalizationResult } from '@/types/location'

export function NormalizationPage() {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()

  const { data, isLoading } = useQuery<{ success: boolean; runs: NormalizationResult[] }>({
    queryKey: QUERY_KEYS.NORMALIZATION_RUNS,
    queryFn: async () => {
      const { data } = await api.get('/locations/normalization/runs')
      return data
    },
  })

  const runMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/locations/normalization/run')
      return data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Started', description: 'Normalization run started' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.NORMALIZATION_RUNS })
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to start normalization' }),
  })

  const runs = data?.runs || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Address Normalization</h2>
          <p className="text-sm text-muted-foreground">Normalize lead addresses to improve delivery accuracy</p>
        </div>
        <Button onClick={() => runMutation.mutate()} disabled={runMutation.isPending}>
          {runMutation.isPending ? 'Running...' : 'Run Normalization'}
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Processed</p>
            <p className="text-2xl font-semibold mt-1">
              {runs.reduce((s, r) => s + r.totalProcessed, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Normalized</p>
            <p className="text-2xl font-semibold mt-1 text-emerald-600 dark:text-emerald-400">
              {runs.reduce((s, r) => s + r.normalized, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Ambiguous</p>
            <p className="text-2xl font-semibold mt-1 text-amber-600 dark:text-amber-400">
              {runs.reduce((s, r) => s + r.ambiguous, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-2xl font-semibold mt-1 text-red-600 dark:text-red-400">
              {runs.reduce((s, r) => s + r.failed, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Runs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading...</div>
          ) : !runs.length ? (
            <div className="p-4 text-sm text-muted-foreground">No normalization runs yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Run ID</th>
                    <th className="px-4 py-3 font-medium">Started</th>
                    <th className="px-4 py-3 font-medium">Completed</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Processed</th>
                    <th className="px-4 py-3 font-medium">Normalized</th>
                    <th className="px-4 py-3 font-medium">Ambiguous</th>
                    <th className="px-4 py-3 font-medium">Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run._id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-3 font-mono text-xs">{run.runId.slice(0, 12)}...</td>
                      <td className="px-4 py-3">{formatDate(run.startedAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{run.completedAt ? formatDate(run.completedAt) : '--'}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${
                          run.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          run.status === 'running' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {run.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{formatNumber(run.totalProcessed)}</td>
                      <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">{formatNumber(run.normalized)}</td>
                      <td className="px-4 py-3 text-amber-600 dark:text-amber-400">{formatNumber(run.ambiguous)}</td>
                      <td className="px-4 py-3 text-red-600 dark:text-red-400">{formatNumber(run.failed)}</td>
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
