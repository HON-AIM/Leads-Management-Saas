import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDate } from '@/lib/utils'
import type { Campaign } from '@/types/campaign'

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

  const statusStyles: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
    inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  }

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
          <div className="absolute inset-0 bg-black/30" />
        </div>
      )}

      <div className={`fixed top-0 right-0 z-50 h-full w-full max-w-xl border-l bg-white shadow-xl transition-transform duration-300 dark:bg-slate-900 ${campaign ? 'translate-x-0' : 'translate-x-full'}`}>
        {campaign && (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">{campaign.name}</h2>
                {campaign.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{campaign.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <Badge className={`text-[10px] px-2 py-0.5 ${statusStyles[campaign.status] || ''}`}>{campaign.status}</Badge>
                <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    tab === t.key
                      ? 'border-blue-600 text-slate-900 dark:text-slate-100'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
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
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Routing Method</h4>
                    <div className="flex gap-2">
                      {(['round_robin', 'weighted', 'priority'] as const).map((mode) => (
                        <div
                          key={mode}
                          className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                            campaign.routingMode === mode
                              ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              : 'border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-500'
                          }`}
                        >
                          {routingLabel[mode]}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Assigned Buyers ({campaign.assignedBuyers.length})</h4>
                    {campaign.assignedBuyers.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">No buyers assigned</p>
                    ) : (
                      <div className="space-y-1.5">
                        {campaign.assignedBuyers.map((b, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2">
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{b.buyerId.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{b.buyerId.email}</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
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
                  {campaign.assignedBuyers.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-sm text-slate-500 dark:text-slate-400">No buyers assigned to this campaign</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => { onEdit(campaign); onClose() }}>
                        Edit Campaign
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {campaign.assignedBuyers.map((b, i) => (
                        <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{b.buyerId.name}</p>
                            <Badge className={`text-[10px] px-2 py-0.5 ${
                              b.buyerId.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                              : b.buyerId.status === 'full' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                            }`}>{b.buyerId.status}</Badge>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{b.buyerId.email}</p>
                          <div className="flex gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                            {campaign.routingMode === 'weighted' && <span>Weight: {b.weight}</span>}
                            {campaign.routingMode === 'priority' && <span>Priority: {b.priority}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'webhook' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Webhook URL</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Post leads to this campaign's endpoint</p>
                    {campaign.webhookUrl ? (
                      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
                        <p className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all">{campaign.webhookUrl}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No webhook URL configured</p>
                    )}
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Webhook Payload</h4>
                    <pre className="text-[11px] text-slate-600 dark:text-slate-400 whitespace-pre-wrap overflow-x-auto mt-2">
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
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-10">No activity recorded yet</p>
                  ) : (
                    (Array.isArray(activityData) ? activityData : []).map((item: any, i: number) => (
                      <div key={item._id || i} className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2">
                        <div className="mt-1 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-slate-900 dark:text-slate-100">{item.message || item.type}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
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
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Campaign Status</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{campaign.status === 'active' ? 'Active and routing leads' : 'Paused'}</p>
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
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Edit Campaign</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Update routing, buyers, and settings</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => { onEdit(campaign); onClose() }}>
                        Edit
                      </Button>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">Delete Campaign</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Permanently remove this campaign</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
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
            <div className="flex items-center gap-2 border-t border-slate-200 dark:border-slate-800 px-6 py-3">
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
      <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 capitalize">{value}</p>
    </div>
  )
}
