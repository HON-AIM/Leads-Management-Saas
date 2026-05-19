import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useSocket } from '@/hooks/useSocket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReassignmentModal } from '@/components/ownership/ReassignmentModal'
import { AuditTable } from '@/components/ownership/AuditTable'
import type { Lead } from '@/types/lead'
import type { AuditEvent } from '@/types/ownership'

export function ReassignmentsPage() {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const { data: leadsData } = useQuery({
    queryKey: ['leads', 'assigned'],
    queryFn: async () => {
      const { data } = await api.get('/leads?limit=100&status=assigned')
      return data as { leads: Lead[] }
    },
  })

  const leads = leadsData?.leads || []

  const { data: auditData } = useQuery({
    queryKey: ['audit', 'reassignments'],
    queryFn: async () => {
      const { data } = await api.get('/audit/ownership?eventType=reassigned&limit=50')
      return data as { success: boolean; audit: AuditEvent[] }
    },
  })

  const recentReassignments = auditData?.audit || []

  const queryClient = useQueryClient()
  const { subscribe } = useSocket()
  const selectedLead = leads.find((l) => l._id === selectedLeadId)

  useEffect(() => {
    const unsubscribe = subscribe('reassignment', () => {
      queryClient.invalidateQueries({ queryKey: ['leads', 'assigned'] })
      queryClient.invalidateQueries({ queryKey: ['audit', 'reassignments'] })
    })

    return () => unsubscribe()
  }, [queryClient, subscribe])

  const handleReassignSuccess = () => {
    setModalOpen(false)
    setSelectedLeadId(null)
    queryClient.invalidateQueries({ queryKey: ['leads', 'assigned'] })
    queryClient.invalidateQueries({ queryKey: ['audit', 'reassignments'] })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reassignments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Transfer lead ownership while preserving full audit history
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Assigned Leads</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto">
              {leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50 mb-2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <p className="text-sm text-muted-foreground">No assigned leads available</p>
                </div>
              ) : (
                leads.map((lead) => (
                  <div
                    key={lead._id}
                    className={`flex items-center justify-between px-4 py-3 border-b last:border-0 text-sm hover:bg-muted/30 transition-colors cursor-pointer ${
                      selectedLeadId === lead._id ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedLeadId(lead._id)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{lead.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {lead.email} · {lead.state}
                      </p>
                      {lead.assignedTo && (
                        <p className="text-[11px] text-muted-foreground">
                          Buyer: {lead.assignedTo.name}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-3 shrink-0 text-[11px] h-7 px-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedLeadId(lead._id)
                        setModalOpen(true)
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                      Reassign
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Reassignments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AuditTable audit={recentReassignments} showLeadId />
          </CardContent>
        </Card>
      </div>

      {modalOpen && selectedLeadId && selectedLead && (
        <ReassignmentModal
          leadId={selectedLeadId}
          leadName={selectedLead.name}
          currentBuyerId={selectedLead.assignedTo?._id || ''}
          currentBuyerName={selectedLead.assignedTo?.name || null}
          onClose={() => { setModalOpen(false); setSelectedLeadId(null) }}
          onSuccess={handleReassignSuccess}
        />
      )}
    </div>
  )
}
