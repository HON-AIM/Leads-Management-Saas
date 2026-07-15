import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { getStatusStyle, LEAD_STATUS_COLOR, DELIVERY_STATUS_COLOR, type SemanticKey } from '@/lib/statusColors'
import { useNotifications } from '@/hooks/useNotifications'
import type { LeadDetail, DeliveryAttempt } from '@/types/lead'
import type { Buyer } from '@/types/buyer'
import { X, UserPlus, ChevronDown, ChevronRight, Check, Clock, Webhook } from 'lucide-react'

interface LeadDrawerProps {
  leadId: string | null
  onClose: () => void
}

export function LeadDrawer({ leadId, onClose }: LeadDrawerProps) {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()
  const [selectedBuyerId, setSelectedBuyerId] = useState('')

  const { data: lead, isLoading } = useQuery<LeadDetail>({
    queryKey: ['lead-detail', leadId],
    queryFn: async () => {
      const { data } = await api.get(`/leads/${leadId}`)
      return data.data ?? data
    },
    enabled: !!leadId,
  })

  const { data: buyersData } = useQuery({
    queryKey: ['buyers'],
    queryFn: async () => {
      const { data } = await api.get('/buyers')
      return data.data ?? data.buyers ?? data ?? []
    },
  })
  const allBuyers: Buyer[] = Array.isArray(buyersData) ? buyersData : []
  const activeBuyers = allBuyers.filter((b) => b.status === 'active')

  const { data: attemptsData } = useQuery<DeliveryAttempt[]>({
    queryKey: ['delivery-attempts', leadId],
    queryFn: async () => {
      const { data } = await api.get(`/delivery-logs/lead/${leadId}/attempts`)
      return data.data ?? []
    },
    enabled: !!leadId,
  })

  const reassignMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/leads/${leadId}/reassign`, { buyerId: selectedBuyerId })
      return data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Reassigned', description: 'Lead has been reassigned successfully.' })
      qc.invalidateQueries({ queryKey: ['lead-detail', leadId] })
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.STATS })
      setSelectedBuyerId('')
    },
    onError: (err: any) => {
      addNotification({ type: 'error', title: 'Failed', description: err?.response?.data?.error || 'Could not reassign lead.' })
    },
  })

  if (!leadId) return null

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      </div>

      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-lg border-l border-white/[0.08] bg-[#0e1428] shadow-drawer animate-slide-in-right">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
            <div className="min-w-0 flex-1">
              {isLoading ? (
                <div className="h-5 w-32 skeleton bg-white/[0.05] rounded" />
              ) : (
                <>
                  <h2 className="text-[14px] font-semibold text-white truncate">{lead?.name}</h2>
                  <p className="text-[11px] text-muted-foreground truncate">{lead?.email}</p>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors shrink-0 ml-3"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {isLoading ? (
              <div className="space-y-5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2.5">
                    <div className="h-3 w-20 skeleton bg-white/[0.05] rounded" />
                    <div className="h-4 w-full skeleton bg-white/[0.05] rounded" />
                    <div className="h-4 w-3/4 skeleton bg-white/[0.05] rounded" />
                  </div>
                ))}
              </div>
            ) : lead ? (
              <>
                <Section title="Lead Information">
                  <InfoRow label="Name" value={lead.name} />
                  <InfoRow label="Email" value={lead.email} />
                  {lead.phone && <InfoRow label="Phone" value={lead.phone} />}
                  <InfoRow label="State" value={lead.state || '—'} />
                  <InfoRow label="Source" value={lead.source || '—'} />
                  <InfoRow label="Campaign" value={lead.campaignId?.name || '—'} />
                  <div className="flex items-center gap-2.5 py-1">
                    <span className="text-[11px] text-muted-foreground w-[72px] shrink-0">Status</span>
                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${getStatusStyle(LEAD_STATUS_COLOR[lead.status] ?? 'neutral')}`}>
                      {lead.status}
                    </span>
                  </div>
                  <InfoRow label="Created" value={formatDate(lead.createdAt)} />
                </Section>

                <Section title="Assignment">
                  {lead.assignment ? (
                    <>
                      <InfoRow label="Buyer" value={lead.assignment.buyerId?.name || '—'} />
                      <InfoRow label="Email" value={lead.assignment.buyerId?.email || '—'} />
                      <InfoRow label="Routing" value={lead.assignment.routingMode?.replace(/_/g, ' ') || '—'} />
                      <div className="flex items-center gap-2.5 py-1">
                        <span className="text-[11px] text-muted-foreground w-[72px] shrink-0">Status</span>
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${getStatusStyle(DELIVERY_STATUS_COLOR[lead.assignment.status] ?? 'neutral')}`}>
                          {lead.assignment.status}
                        </span>
                      </div>
                      <InfoRow label="Assigned" value={formatDate(lead.assignment.createdAt)} />
                      {lead.assignment.deliveredAt && (
                        <InfoRow label="Delivered" value={formatDate(lead.assignment.deliveredAt)} />
                      )}
                    </>
                  ) : (
                    <p className="text-[12px] text-muted-foreground">No assignment</p>
                  )}
                </Section>

                <Section title="Delivery Attempts">
                  {attemptsData && attemptsData.length > 0 ? (
                    <div className="space-y-0">
                      {attemptsData.map((attempt, idx) => (
                        <AttemptEntry
                          key={attempt._id}
                          attempt={attempt}
                          isLast={idx === attemptsData.length - 1}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-muted-foreground">No delivery attempts yet</p>
                  )}
                </Section>

                {lead.status === 'unassigned' && (
                  <Section title="Reassign Lead">
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-4 space-y-3">
                      <p className="text-[12px] text-amber-300/80">This lead is unassigned. Select a buyer to assign it to.</p>
                      <div className="flex items-center gap-2">
                        <UserPlus size={14} className="text-muted-foreground shrink-0" />
                        <select
                          value={selectedBuyerId}
                          onChange={(e) => setSelectedBuyerId(e.target.value)}
                          className="flex-1 text-xs border border-white/[0.15] rounded-lg px-3 py-2 bg-[#151d33] text-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 cursor-pointer"
                          style={{ colorScheme: 'dark' }}
                        >
                          <option value="" className="bg-[#151d33] text-white/60">Select buyer...</option>
                          {activeBuyers.map((b) => (
                            <option key={b._id} value={b._id} className="bg-[#151d33] text-white">{b.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => reassignMutation.mutate()}
                          disabled={!selectedBuyerId || reassignMutation.isPending}
                          className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-[12px] font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {reassignMutation.isPending ? 'Assigning...' : 'Assign'}
                        </button>
                      </div>
                    </div>
                  </Section>
                )}

                <Section title="Routing Decision">
                  {lead.routingLogs && lead.routingLogs.length > 0 ? (
                    <div className="space-y-3">
                      {lead.routingLogs.map((log) => (
                        <div key={log._id} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-medium text-white capitalize">
                              {log.routingMode?.replace(/_/g, ' ')}
                            </span>
                            {log.durationMs != null && (
                              <span className="text-[10px] text-muted-foreground">{log.durationMs}ms</span>
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Eligible Buyers</p>
                            <div className="flex flex-wrap gap-1">
                              {log.eligibleBuyerIds.map((b) => (
                                <span
                                  key={b._id}
                                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                    log.selectedBuyerId?._id === b._id
                                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                       : 'bg-white/[0.06] text-white/60'
                                  }`}
                                >
                                  {b.name}
                                </span>
                              ))}
                            </div>
                          </div>
                          {log.selectedBuyerId && (
                            <InfoRow label="Selected" value={log.selectedBuyerId.name} />
                          )}
                          {log.reason && (
                            <InfoRow label="Reason" value={log.reason} />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-muted-foreground">No routing data</p>
                  )}
                </Section>

                <Section title="Webhook Payload">
                  {lead.rawPayload ? (
                    <pre className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 text-[11px] text-white/70 whitespace-pre-wrap overflow-x-auto max-h-60 overflow-y-auto font-mono">
                      {JSON.stringify(lead.rawPayload, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-[12px] text-muted-foreground">No payload data</p>
                  )}
                </Section>

                <Section title="Timeline">
                  <div className="space-y-0">
                    <LogEntry
                      dotColor="bg-white/20"
                      label="Lead received"
                      value={lead.source || 'form'}
                      time={lead.createdAt}
                    />
                    {lead.routingLogs?.map((log) => (
                      <LogEntry
                        key={log._id}
                        dotColor="bg-blue-500"
                        label="Routed"
                        value={`${log.routingMode?.replace(/_/g, ' ')} → ${log.selectedBuyerId?.name || 'none'}`}
                        time={log.createdAt}
                      />
                    ))}
                    {lead.assignment?.status === 'delivered' && (
                      <LogEntry
                        dotColor="bg-emerald-500"
                        label="Delivered"
                        value={lead.assignment.buyerId?.name}
                        time={lead.assignment.deliveredAt}
                      />
                    )}
                    {lead.assignment?.status === 'failed' && (
                      <LogEntry
                        dotColor="bg-red-500"
                        label="Delivery failed"
                        value={lead.assignment.buyerId?.name}
                        time={lead.assignment.createdAt}
                      />
                    )}
                  </div>
                </Section>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 py-0.5">
      <span className="text-[11px] text-muted-foreground w-[72px] shrink-0">{label}</span>
      <span className="text-[13px] text-white/80">{value}</span>
    </div>
  )
}

function LogEntry({ dotColor, label, value, time }: { dotColor: string; label: string; value?: string; time?: string }) {
  return (
    <div className="flex items-start gap-3 relative">
      <div className="absolute left-[5px] top-[14px] bottom-0 w-px bg-white/[0.06]" />
      <div className={`mt-[7px] h-[10px] w-[10px] rounded-full ${dotColor} shrink-0 relative z-10 ring-2 ring-[#0e1428]`} />
      <div className="min-w-0 flex-1 pb-4">
        <p className="text-[13px] text-white/80">{label}</p>
        {value && <p className="text-[11px] text-muted-foreground capitalize">{value}</p>}
      </div>
      {time && (
        <span className="text-[10px] text-muted-foreground/70 shrink-0 mt-0.5">{formatDate(time)}</span>
      )}
    </div>
  )
}

function AttemptEntry({ attempt, isLast }: { attempt: DeliveryAttempt; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false)

  const buyerName = typeof attempt.buyerId === 'object' ? attempt.buyerId?.name : 'Unknown'
  const triggerLabel = attempt.triggeredBy === 'manual_retry'
    ? `Manual retry`
    : 'Automatic'
  const triggerUser = typeof attempt.triggeredByUserId === 'object' ? attempt.triggeredByUserId?.name : null

  const payloadStr = attempt.payloadSent ? JSON.stringify(attempt.payloadSent, null, 2) : '{}'
  const responseStr = attempt.responseBody != null
    ? (typeof attempt.responseBody === 'string' ? attempt.responseBody : JSON.stringify(attempt.responseBody, null, 2))
    : null

  return (
    <div className="flex items-start gap-3 relative">
      {!isLast && <div className="absolute left-[5px] top-[14px] bottom-0 w-px bg-white/[0.06]" />}
      <div className={`mt-[7px] h-[10px] w-[10px] rounded-full shrink-0 relative z-10 ring-2 ring-[#0e1428] ${attempt.success ? 'bg-emerald-500' : 'bg-red-500'}`} />
      <div className="min-w-0 flex-1 pb-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 w-full text-left group"
        >
          {expanded ? <ChevronDown size={12} className="text-muted-foreground shrink-0" /> : <ChevronRight size={12} className="text-muted-foreground shrink-0" />}
          <span className="text-[13px] text-white/80 font-medium">
            Attempt #{attempt.attemptNumber}
          </span>
          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${attempt.success
            ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-inset ring-emerald-400/40'
            : 'bg-red-500/20 text-red-300 ring-1 ring-inset ring-red-400/40'
          }`}>
            {attempt.success ? 'Delivered' : 'Failed'}
          </span>
          <span className="text-[11px] text-muted-foreground">to {buyerName}</span>
        </button>

        <div className="flex items-center gap-3 mt-1 ml-5">
          <span className="text-[10px] text-muted-foreground/70">{formatDate(attempt.createdAt)}</span>
          {attempt.durationMs != null && (
            <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
              <Clock size={9} /> {attempt.durationMs}ms
            </span>
          )}
          {attempt.statusCode != null && (
            <span className={`text-[10px] font-mono ${attempt.statusCode >= 200 && attempt.statusCode < 300 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
              HTTP {attempt.statusCode}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/50">
            {triggerLabel}{triggerUser ? ` by ${triggerUser}` : ''}
          </span>
        </div>

        {attempt.failureReason && (
          <p className="text-[11px] text-red-400/80 mt-1 ml-5">{attempt.failureReason}</p>
        )}

        {expanded && (
          <div className="mt-3 ml-5 space-y-3">
            <CodeBlock label="Payload Sent" icon={<Webhook size={11} />} content={payloadStr} />
            {responseStr && (
              <CodeBlock label="Response Received" icon={attempt.success ? <Check size={11} className="text-emerald-400" /> : <X size={11} className="text-red-400" />} content={responseStr} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CodeBlock({ label, icon, content }: { label: string; icon: React.ReactNode; content: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#0a0f1e]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40">
          {icon}
          <span>{label}</span>
        </div>
        <button
          onClick={handleCopy}
          className="rounded p-1 text-muted-foreground/30 hover:bg-white/[0.04] hover:text-white/70 transition-colors text-[10px]"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="overflow-auto max-h-[300px] p-3">
        <pre className="text-[11px] font-mono text-white/60 leading-relaxed whitespace-pre-wrap break-all">
          {content}
        </pre>
      </div>
    </div>
  )
}
