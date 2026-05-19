import { useState, useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useSocket } from '@/hooks/useSocket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OwnershipCard } from '@/components/ownership/OwnershipCard'
import { RoutingTimeline } from '@/components/ownership/RoutingTimeline'
import { DeliveryTrace } from '@/components/ownership/DeliveryTrace'
import { SyncStatusBadge } from '@/components/ownership/SyncStatusBadge'
import { ReassignmentModal } from '@/components/ownership/ReassignmentModal'
import { Button } from '@/components/ui/button'
import type { OwnershipResponse, RoutingHistoryResponse, DeliveryStage } from '@/types/ownership'
import type { Lead } from '@/types/lead'

const QUERY_KEYS = {
  LEADS: ['leads'],
}

export function OwnershipPage() {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [reassignModalOpen, setReassignModalOpen] = useState(false)

  const { data: leadsData } = useQuery({
    queryKey: [...QUERY_KEYS.LEADS, 'list', { limit: '50' }],
    queryFn: async () => {
      const { data } = await api.get('/leads?limit=50')
      return data
    },
  })

  const leads: Lead[] = leadsData?.leads || []

  const { data: ownershipData, isLoading: ownershipLoading } = useQuery<OwnershipResponse>({
    queryKey: ['ownership', selectedLeadId],
    queryFn: async () => {
      const { data } = await api.get(`/leads/${selectedLeadId}/ownership`)
      return data
    },
    enabled: !!selectedLeadId,
  })

  const queryClient = useQueryClient()
  const { subscribe } = useSocket()

  const { data: historyData, isLoading: historyLoading } = useQuery<RoutingHistoryResponse>({
    queryKey: ['routing-history', selectedLeadId],
    queryFn: async () => {
      const { data } = await api.get(`/leads/${selectedLeadId}/history`)
      return data
    },
    enabled: !!selectedLeadId,
  })

  useEffect(() => {
    if (!selectedLeadId) return

    const unsubscribeAssignment = subscribe('lead_assignment', () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LEADS })
      queryClient.invalidateQueries({ queryKey: ['ownership', selectedLeadId] })
      queryClient.invalidateQueries({ queryKey: ['routing-history', selectedLeadId] })
    })
    const unsubscribeReassignment = subscribe('lead_reassigned', () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LEADS })
      queryClient.invalidateQueries({ queryKey: ['ownership', selectedLeadId] })
      queryClient.invalidateQueries({ queryKey: ['routing-history', selectedLeadId] })
    })
    const unsubscribeSync = subscribe('crm_sync_update', () => {
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] })
      queryClient.invalidateQueries({ queryKey: ['ownership', selectedLeadId] })
    })

    return () => {
      unsubscribeAssignment()
      unsubscribeReassignment()
      unsubscribeSync()
    }
  }, [selectedLeadId, queryClient, subscribe])

  const buildDeliveryStages = (lead: Lead): DeliveryStage[] => {
    return [
      { stage: 'received', label: 'Lead Received', status: 'completed', timestamp: lead.createdAt, duration: null, payload: null, error: null },
      { stage: 'routing', label: 'Routing Decision', status: lead.assignedTo ? 'completed' : 'failed', timestamp: lead.createdAt, duration: null, payload: null, error: null },
      { stage: 'assignment', label: 'Assignment', status: lead.assignedTo ? 'completed' : 'skipped', timestamp: lead.updatedAt, duration: null, payload: null, error: null },
      { stage: 'delivery', label: 'Webhook Delivery', status: lead.deliveryStatus === 'delivered' ? 'completed' : lead.deliveryStatus === 'failed' ? 'failed' : 'pending', timestamp: lead.updatedAt, duration: null, payload: null, error: null },
      { stage: 'crm_sync', label: 'CRM Sync', status: 'pending', timestamp: null, duration: null, payload: null, error: null },
      { stage: 'confirmation', label: 'Confirmation', status: 'pending', timestamp: null, duration: null, payload: null, error: null },
    ]
  }

  const selectedLead = leads.find((l) => l._id === selectedLeadId)

  const handleLeadSelect = useCallback((id: string) => {
    setSelectedLeadId(id)
    setReassignModalOpen(false)
  }, [])

  const handleReassignSuccess = useCallback(() => {
    setReassignModalOpen(false)
    if (selectedLeadId) {
      queryClient.invalidateQueries({ queryKey: ['ownership', selectedLeadId] })
      queryClient.invalidateQueries({ queryKey: ['routing-history', selectedLeadId] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LEADS })
    }
  }, [selectedLeadId, queryClient])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lead Ownership</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track ownership, routing history, and delivery status per lead
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Leads</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {leads.map((lead) => (
                  <button
                    key={lead._id}
                    onClick={() => handleLeadSelect(lead._id)}
                    className={`w-full text-left px-4 py-2.5 border-b last:border-0 text-sm transition-colors hover:bg-muted/50 ${
                      selectedLeadId === lead._id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                    }`}
                  >
                    <p className="font-medium truncate">{lead.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {lead.email} · {lead.state}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        lead.status === 'assigned'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          : lead.status === 'unassigned'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {lead.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {!selectedLeadId ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40 mb-3">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <p className="text-sm text-muted-foreground">Select a lead to view ownership details</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{selectedLead?.name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedLead?.email} · {selectedLead?.state}</p>
                </div>
                <Button onClick={() => setReassignModalOpen(true)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                  Reassign
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ownershipLoading ? (
                  <Card><CardContent className="h-48 animate-pulse bg-muted/30 rounded-xl" /></Card>
                ) : ownershipData?.ownership ? (
                  <OwnershipCard ownership={ownershipData.ownership} />
                ) : null}

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Delivery Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedLead && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Delivery Status</span>
                          <SyncStatusBadge
                            status={selectedLead.deliveryStatus === 'delivered'}
                            platform={selectedLead.source}
                          />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Ingestion</span>
                          <span className="font-medium capitalize">{selectedLead.ingestionStatus}</span>
                        </div>
                        {ownershipData?.ownership?.externalReferences && (
                          <div className="border-t pt-2 space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground">External References</p>
                            {ownershipData.ownership.externalReferences.ghlContactId && (
                              <p className="text-xs">GHL Contact: <span className="font-mono text-primary">{ownershipData.ownership.externalReferences.ghlContactId}</span></p>
                            )}
                            {ownershipData.ownership.externalReferences.facebookLeadId && (
                              <p className="text-xs">FB Lead: <span className="font-mono text-primary">{ownershipData.ownership.externalReferences.facebookLeadId}</span></p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Routing Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {historyLoading ? (
                      <div className="space-y-3 p-2">
                        {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />)}
                      </div>
                    ) : (
                      <RoutingTimeline events={historyData?.history || []} />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Delivery Trace</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedLead && <DeliveryTrace stages={buildDeliveryStages(selectedLead)} />}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>

      {reassignModalOpen && selectedLeadId && selectedLead && (
        <ReassignmentModal
          leadId={selectedLeadId}
          leadName={selectedLead.name}
          currentBuyerId={selectedLead.assignedTo?._id || ''}
          currentBuyerName={selectedLead.assignedTo?.name || null}
          onClose={() => setReassignModalOpen(false)}
          onSuccess={handleReassignSuccess}
        />
      )}
    </div>
  )
}
