import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDate } from '@/lib/utils'
import type { AmbiguousLead } from '@/types/location'

export function AmbiguousLeadQueue() {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery<{ success: boolean; leads: AmbiguousLead[] }>({
    queryKey: QUERY_KEYS.AMBIGUOUS_LEADS,
    queryFn: async () => {
      const { data } = await api.get('/locations/ambiguous-leads')
      return data
    },
  })

  const acceptMutation = useMutation({
    mutationFn: async ({ id, suggestion }: { id: string; suggestion: AmbiguousLead['suggestions'][0] }) => {
      await api.post(`/locations/ambiguous-leads/${id}/accept`, { suggestion })
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Accepted', description: 'Suggestion accepted' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.AMBIGUOUS_LEADS })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.LOCATION_STATS })
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to accept suggestion' }),
  })

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/locations/ambiguous-leads/${id}/reject`)
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Rejected', description: 'Lead rejected' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.AMBIGUOUS_LEADS })
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to reject' }),
  })

  const leads = data?.leads || []

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading ambiguous leads...</div>
  }

  if (!leads.length) {
    return <div className="p-4 text-sm text-muted-foreground">No ambiguous leads pending review.</div>
  }

  return (
    <div className="space-y-3">
      {leads.map((lead) => (
        <Card key={lead._id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{lead.originalAddress}</CardTitle>
              <Badge className="text-xs bg-muted text-muted-foreground">{lead.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{formatDate(lead.createdAt)}</p>
          </CardHeader>
          <CardContent>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setExpandedId(expandedId === lead._id ? null : lead._id)}
            >
              {expandedId === lead._id ? 'Hide' : 'Show'} suggestions ({lead.suggestions.length})
            </Button>

            {expandedId === lead._id && (
              <div className="mt-3 space-y-2">
                {lead.suggestions.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <div>
                      <p className="font-medium">{s.address}</p>
                      <p className="text-xs text-muted-foreground">
                        ({s.lat.toFixed(4)}, {s.lng.toFixed(4)}) &middot; {(s.confidence * 100).toFixed(0)}% confidence
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => acceptMutation.mutate({ id: lead._id, suggestion: s })}>
                        Accept
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => rejectMutation.mutate(lead._id)}>
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
