import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { STATUS_STYLES, DELIVERY_STYLES } from '@/types/lead'
import { formatDate } from '@/lib/utils'
import type { LeadDetail } from '@/types/lead'

interface LeadDetailDrawerProps {
  leadId: string | null
  onClose: () => void
}

const TABS = ['Details', 'Routing History', 'Delivery Timeline', 'Raw Payload'] as const

export function LeadDetailDrawer({ leadId, onClose }: LeadDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<string>('Details')

  const { data: detail, isLoading } = useQuery<{ success: boolean; lead: LeadDetail }>({
    queryKey: [...QUERY_KEYS.LEADS, leadId],
    queryFn: async () => {
      const { data } = await api.get(`/leads/${leadId}`)
      return data
    },
    enabled: !!leadId,
  })

  const lead = detail?.lead

  return (
    <>
      {leadId && (
        <div className="fixed inset-0 z-50" onClick={onClose}>
          <div className="absolute inset-0 bg-black/30" />
        </div>
      )}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-xl border-l bg-background shadow-xl transition-transform duration-300 ${
          leadId ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold">
              {isLoading ? 'Loading...' : lead?.name || 'Lead Details'}
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center flex-1 text-sm text-muted-foreground">
              Loading lead details...
            </div>
          ) : lead ? (
            <>
              <div className="flex border-b">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto">
                {activeTab === 'Details' && (
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <DetailField label="Email" value={lead.email} />
                      <DetailField label="Phone" value={lead.phone || '-'} />
                      <DetailField label="State" value={lead.state} />
                      <DetailField label="Source" value={lead.source} />
                      <DetailField label="Campaign" value={lead.campaign || '-'} />
                      <DetailField label="Score" value={lead.score != null ? lead.score.toString() : '-'} />
                      <div className="col-span-2">
                        <span className="text-xs text-muted-foreground block mb-1">Status</span>
                        <div className="flex gap-2">
                          <Badge className={STATUS_STYLES[lead.status] || ''}>{lead.status}</Badge>
                          <Badge className={DELIVERY_STYLES[lead.deliveryStatus] || ''}>{lead.deliveryStatus}</Badge>
                          <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">{lead.ingestionStatus}</Badge>
                        </div>
                      </div>
                      <DetailField label="Assigned To" value={lead.assignedTo?.name || '-'} />
                      <DetailField label="Client" value={lead.assignedTo?.routingMode || '-'} />
                    </div>

                    {lead.notes && (
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Notes</span>
                        <p className="text-sm bg-muted rounded-lg p-3">{lead.notes}</p>
                      </div>
                    )}

                    {lead.tags && lead.tags.length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Tags</span>
                        <div className="flex flex-wrap gap-1">
                          {lead.tags.map((tag) => (
                            <Badge key={tag} className="bg-secondary text-secondary-foreground">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {lead.metadata && Object.keys(lead.metadata).length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Metadata</span>
                        <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto max-h-40">
                          {JSON.stringify(lead.metadata, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                      <DetailField label="Created" value={formatDate(lead.createdAt)} />
                      <DetailField label="Updated" value={formatDate(lead.updatedAt)} />
                    </div>
                  </div>
                )}

                {activeTab === 'Routing History' && (
                  <div className="p-6">
                    {lead.routingHistory && lead.routingHistory.length > 0 ? (
                      <div className="space-y-0">
                        {lead.routingHistory.map((event, idx) => (
                          <div key={event._id} className="relative pl-6 pb-6 last:pb-0">
                            {idx < lead.routingHistory.length - 1 && (
                              <div className="absolute left-2.5 top-3 bottom-0 w-px bg-border" />
                            )}
                            <div className="absolute left-1.5 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-primary bg-background" />
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium capitalize">{event.action.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-muted-foreground">
                                {event.fromState} → {event.toState}
                                {event.fromClient && ` (${event.fromClient} → ${event.toClient})`}
                              </p>
                              <p className="text-xs text-muted-foreground">{event.reason}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-8 text-center">No routing history</p>
                    )}
                  </div>
                )}

                {activeTab === 'Delivery Timeline' && (
                  <div className="p-6">
                    {lead.deliveryTimeline && lead.deliveryTimeline.length > 0 ? (
                      <div className="space-y-3">
                        {lead.deliveryTimeline.map((event) => (
                          <div key={event._id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                            <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                              event.status === 'success' || event.status === 'delivered'
                                ? 'bg-emerald-500'
                                : event.status === 'failed'
                                ? 'bg-red-500'
                                : 'bg-amber-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium capitalize">{event.stage}</p>
                                <span className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{event.message}</p>
                              {event.clientName && (
                                <p className="text-xs text-muted-foreground mt-0.5">Client: {event.clientName}</p>
                              )}
                              {event.duration > 0 && (
                                <p className="text-xs text-muted-foreground">{event.duration}ms</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-8 text-center">No delivery timeline</p>
                    )}
                  </div>
                )}

                {activeTab === 'Raw Payload' && (
                  <div className="p-6">
                    {lead.rawPayload ? (
                      <pre className="text-xs bg-muted rounded-lg p-4 overflow-x-auto max-h-[60vh] font-mono">
                        {JSON.stringify(lead.rawPayload, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-sm text-muted-foreground py-8 text-center">No raw payload data</p>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center flex-1 text-sm text-muted-foreground">
              Lead not found
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground block mb-0.5">{label}</span>
      <span className="text-sm font-medium break-all">{value}</span>
    </div>
  )
}
