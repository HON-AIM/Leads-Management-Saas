import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDate } from '@/lib/utils'
import { getStatusStyle, CAMPAIGN_STATUS_COLOR, BUYER_STATUS_COLOR } from '@/lib/statusColors'
import type { Campaign } from '@/types/campaign'
import type { Buyer } from '@/types/buyer'
import { UserPlus, X } from 'lucide-react'

interface CampaignDetailDrawerProps {
  campaign: Campaign | null
  onClose: () => void
  onEdit: (campaign: Campaign) => void
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'routing', label: 'Routing Rules' },
  { key: 'buyers', label: 'Buyers' },
  { key: 'webhook', label: 'Webhook' },
  { key: 'activity', label: 'Activity' },
  { key: 'settings', label: 'Settings' },
] as const

export function CampaignDetailDrawer({ campaign, onClose, onEdit }: CampaignDetailDrawerProps) {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()
  const [tab, setTab] = useState<string>('overview')

  const toggleMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/campaigns/${campaign!._id}/toggle`)
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Toggled', description: `Campaign ${campaign!.status === 'active' ? 'deactivated' : 'activated'}` })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS })
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to toggle campaign' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/campaigns/${campaign!._id}`)
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Deleted', description: 'Campaign deleted' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS })
      onClose()
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to delete campaign' }),
  })

  const { data: activityData } = useQuery({
    queryKey: ['campaign-activity', campaign?._id],
    queryFn: async () => {
      const { data } = await api.get(`/campaigns/${campaign!._id}/activity`)
      return data.data ?? data
    },
    enabled: !!campaign && tab === 'activity',
  })

  const { data: buyersData } = useQuery({
    queryKey: QUERY_KEYS.BUYERS,
    queryFn: async () => {
      const { data } = await api.get('/buyers')
      return data.data ?? data.buyers ?? data ?? []
    },
    enabled: !!campaign && tab === 'buyers',
  })
  const allBuyers: Buyer[] = Array.isArray(buyersData) ? buyersData : []

  const assignedBuyerIds = campaign?.assignedBuyers?.map((b: any) => typeof b.buyerId === 'object' ? b.buyerId._id : b.buyerId) || []
  const availableBuyers = allBuyers.filter((b) => b.status === 'active' && !assignedBuyerIds.includes(b._id))

  const addBuyerMutation = useMutation({
    mutationFn: async (buyerId: string) => {
      const { data } = await api.post(`/campaigns/${campaign!._id}/buyers`, { buyerId, weight: 1, priority: 0 })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS })
      addNotification({ type: 'success', title: 'Buyer added', description: 'Buyer has been assigned to this campaign.' })
    },
    onError: (err: any) => {
      addNotification({ type: 'error', title: 'Failed', description: err?.response?.data?.error || 'Could not add buyer.' })
    },
  })

  const removeBuyerMutation = useMutation({
    mutationFn: async (buyerId: string) => {
      await api.delete(`/campaigns/${campaign!._id}/buyers/${buyerId}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS })
      addNotification({ type: 'success', title: 'Buyer removed', description: 'Buyer has been unassigned from this campaign.' })
    },
    onError: (err: any) => {
      addNotification({ type: 'error', title: 'Failed', description: err?.response?.data?.error || 'Could not remove buyer.' })
    },
  })

  const routingLabel: Record<string, string> = {
    round_robin: 'Round Robin',
    weighted: 'Weighted',
    priority: 'Priority',
    exclusive: 'Exclusive',
  }

  return (
    <>
      {campaign && (
        <div className="fixed inset-0 z-50" onClick={onClose}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        </div>
      )}

      <div className={`fixed top-0 right-0 z-50 h-full w-full max-w-xl border-l border-white/[0.08] bg-[#0e1428] shadow-drawer transition-transform duration-300 ${campaign ? 'translate-x-0' : 'translate-x-full'}`}>
        {campaign && (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-[14px] font-semibold text-white truncate">{campaign.name}</h2>
                {campaign.description && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{campaign.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <Badge className={`text-[10px] px-2 py-0.5 ${getStatusStyle(campaign.status, CAMPAIGN_STATUS_COLOR)}`}>{campaign.status}</Badge>
                <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-white hover:bg-white/[0.06] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/[0.08] overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-3 text-[12px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                    tab === t.key
                      ? 'border-blue-500 text-white'
                      : 'border-transparent text-muted-foreground hover:text-white/70'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {tab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Source" value={campaign.source || 'webhook'} />
                    <Field label="Routing Mode" value={routingLabel[campaign.routingMode] || campaign.routingMode} />
                    <Field label="Buyers Assigned" value={`${campaign.assignedBuyers.length}`} />
                    <Field label="Leads Today" value={`${campaign.leadsToday ?? 0}`} />
                    <Field label="Cost Per Lead" value={`$${campaign.costPerLead ?? 0}`} />
                    <Field label="Dedup Window" value={`${campaign.dedupWindowHours ?? 720}h`} />
                    <Field label="Created" value={formatDate(campaign.createdAt)} />
                    {campaign.lastActivityAt && (
                      <Field label="Last Activity" value={formatDate(campaign.lastActivityAt)} />
                    )}
                  </div>
                </div>
              )}

              {tab === 'routing' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[13px] font-semibold text-white mb-2">Routing Method</h4>
                    <div className="flex gap-2">
                      {(['round_robin', 'weighted', 'priority'] as const).map((mode) => (
                        <div
                          key={mode}
                          className={`rounded-lg border px-3 py-2 text-[11px] font-medium transition-colors ${
                            campaign.routingMode === mode
                              ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                              : 'border-white/[0.08] text-muted-foreground'
                          }`}
                        >
                          {routingLabel[mode]}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[13px] font-semibold text-white mb-2">Assigned Buyers ({campaign.assignedBuyers.length})</h4>
                    {campaign.assignedBuyers.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No buyers assigned</p>
                    ) : (
                      <div className="space-y-1.5">
                        {campaign.assignedBuyers.map((b, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg border border-white/[0.08] px-3 py-2">
                            <div>
                              <p className="text-[13px] font-medium text-white">{b.buyerId.name}</p>
                              <p className="text-[11px] text-muted-foreground">{b.buyerId.email}</p>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              {campaign.routingMode === 'weighted' && <span>W: {b.weight}</span>}
                              {campaign.routingMode === 'priority' && <span>P: {b.priority}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === 'buyers' && (
                <div className="space-y-4">
                  {availableBuyers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <UserPlus size={14} className="text-muted-foreground shrink-0" />
                      <select
                        className="flex-1 text-xs border border-white/[0.12] rounded-lg px-3 py-1.5 bg-[#0e1428] text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            addBuyerMutation.mutate(e.target.value)
                            e.target.value = ''
                          }
                        }}
                      >
                        <option value="">Add buyer to campaign...</option>
                        {availableBuyers.map((b) => (
                          <option key={b._id} value={b._id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {campaign.assignedBuyers.length === 0 ? (
                    <div className="text-center py-10 rounded-lg border border-dashed border-white/[0.12]">
                      <p className="text-[13px] text-muted-foreground mb-3">No buyers assigned to this campaign</p>
                      <Button variant="outline" size="sm" onClick={() => { onEdit(campaign); onClose() }}>
                        Edit Campaign
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {campaign.assignedBuyers.map((b: any, i: number) => {
                        const buyer = typeof b.buyerId === 'object' ? b.buyerId : allBuyers.find((ab) => ab._id === b.buyerId)
                        return (
                          <div key={i} className="rounded-lg border border-white/[0.08] p-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[13px] font-semibold text-white">{buyer?.name || 'Unknown Buyer'}</p>
                              <div className="flex items-center gap-2">
                                {buyer?.status && (
                                  <Badge className={`text-[10px] px-2 py-0.5 ${getStatusStyle(buyer.status, BUYER_STATUS_COLOR)}`}>{buyer.status}</Badge>
                                )}
                                <button
                                  onClick={() => removeBuyerMutation.mutate(typeof b.buyerId === 'object' ? b.buyerId._id : b.buyerId)}
                                  disabled={removeBuyerMutation.isPending}
                                  className="text-muted-foreground hover:text-red-400 transition-colors p-0.5"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                            {buyer?.email && <p className="text-[11px] text-muted-foreground">{buyer.email}</p>}
                            <div className="flex gap-4 mt-2 text-[11px] text-muted-foreground">
                              {campaign.routingMode === 'weighted' && <span>Weight: {b.weight}</span>}
                              {campaign.routingMode === 'priority' && <span>Priority: {b.priority}</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {tab === 'webhook' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[13px] font-semibold text-white mb-1">Webhook URL</h4>
                    <p className="text-[11px] text-muted-foreground mb-3">Post leads to this campaign's endpoint</p>
                    {campaign.webhookUrl ? (
                      <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                        <p className="text-[11px] font-mono text-white/80 break-all">{campaign.webhookUrl}</p>
                      </div>
                    ) : (
                      <p className="text-[13px] text-muted-foreground">No webhook URL configured</p>
                    )}
                  </div>
                  <div className="rounded-lg border border-white/[0.08] p-4">
                    <h4 className="text-[13px] font-semibold text-white mb-1">Webhook Payload</h4>
                    <pre className="text-[11px] text-white/60 whitespace-pre-wrap overflow-x-auto mt-2 font-mono">
{`POST ${campaign.webhookUrl || '/your-webhook-url'}
Content-Type: application/json

{
  "lead_id": "...",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "5551234567",
  "state": "TX",
  "source": "${campaign.source || 'webhook'}",
  "campaign_id": "${campaign._id}",
  "timestamp": "2026-07-10T12:00:00Z"
}`}
                    </pre>
                  </div>
                </div>
              )}

              {tab === 'activity' && (
                <div className="space-y-3">
                  {!activityData || (Array.isArray(activityData) && activityData.length === 0) ? (
                    <p className="text-[13px] text-muted-foreground text-center py-10">No activity recorded yet</p>
                  ) : (
                    (Array.isArray(activityData) ? activityData : []).map((item: any, i: number) => (
                      <div key={item._id || i} className="flex items-start gap-3 rounded-lg border border-white/[0.08] px-3 py-2">
                        <div className="mt-1 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] text-white">{item.message || item.type}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {item.createdAt ? formatDate(item.createdAt) : ''}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === 'settings' && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-white/[0.08] divide-y divide-white/[0.06]">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-[13px] font-medium text-white">Campaign Status</p>
                        <p className="text-[11px] text-muted-foreground">{campaign.status === 'active' ? 'Active and routing leads' : 'Paused'}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleMutation.mutate()}
                        disabled={toggleMutation.isPending}
                      >
                        {campaign.status === 'active' ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-[13px] font-medium text-white">Edit Campaign</p>
                        <p className="text-[11px] text-muted-foreground">Update routing, buyers, and settings</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => { onEdit(campaign); onClose() }}>
                        Edit
                      </Button>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-[13px] font-medium text-red-400">Delete Campaign</p>
                        <p className="text-[11px] text-muted-foreground">Permanently remove this campaign</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-400 border-red-500/20 hover:bg-red-500/10 hover:text-red-400"
                        onClick={() => {
                          if (confirm(`Delete campaign "${campaign.name}"? This cannot be undone.`)) {
                            deleteMutation.mutate()
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 border-t border-white/[0.08] px-6 py-3">
              <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
              <Button size="sm" onClick={() => { onEdit(campaign); onClose() }}>Edit Campaign</Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">{label}</p>
      <p className="text-[13px] font-medium text-white capitalize">{value}</p>
    </div>
  )
}
