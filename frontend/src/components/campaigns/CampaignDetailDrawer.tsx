import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/useNotifications'
import { CampaignAnalytics } from './CampaignAnalytics'
import { formatDate } from '@/lib/utils'
import type { Campaign } from '@/types/campaign'

interface CampaignDetailDrawerProps {
  campaign: Campaign | null
  onClose: () => void
  onEdit: (campaign: Campaign) => void
}

export function CampaignDetailDrawer({ campaign, onClose, onEdit }: CampaignDetailDrawerProps) {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()
  const [tab, setTab] = useState('overview')

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

  const statusStyles: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
    inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  }

  return (
    <>
      {campaign && (
        <div className="fixed inset-0 z-50" onClick={onClose}>
          <div className="absolute inset-0 bg-black/30" />
        </div>
      )}
      <div className={`fixed top-0 right-0 z-50 h-full w-full max-w-xl border-l bg-background shadow-xl transition-transform duration-300 ${campaign ? 'translate-x-0' : 'translate-x-full'}`}>
        {campaign && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">{campaign.name}</h2>
                {campaign.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{campaign.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={statusStyles[campaign.status] || ''}>{campaign.status}</Badge>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </Button>
              </div>
            </div>

            <div className="flex border-b">
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'routing', label: 'Routing' },
                { key: 'sources', label: 'Sources' },
                { key: 'analytics', label: 'Analytics' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    tab === t.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {tab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <DetailField label="Routing Mode" value={campaign.routingMode.replace(/_/g, ' ')} />
                    <DetailField label="Sources" value={campaign.sources.join(', ') || '-'} />
                    <DetailField label="Buyers" value={`${campaign.assignedBuyers.length} assigned`} />
                    <DetailField label="Status" value={campaign.status} />
                    {campaign.startDate && <DetailField label="Start Date" value={formatDate(campaign.startDate)} />}
                    {campaign.endDate && <DetailField label="End Date" value={formatDate(campaign.endDate)} />}
                    <DetailField label="Created" value={formatDate(campaign.createdAt)} />
                  </div>
                </div>
              )}

              {tab === 'routing' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Routing Mode</h4>
                    <Badge className="bg-primary/10 text-primary border border-primary/20 capitalize">
                      {campaign.routingMode.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Assigned Buyers ({campaign.assignedBuyers.length})</h4>
                    {campaign.assignedBuyers.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No buyers assigned</p>
                    ) : (
                      <div className="space-y-1.5">
                        {campaign.assignedBuyers.map((b, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2">
                            <div>
                              <p className="text-sm font-medium">{b.buyerId.name}</p>
                              <p className="text-xs text-muted-foreground">{b.buyerId.email} · {b.buyerId.state}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">Weight: {b.weight}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {campaign.stateRouting.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">State Routing Rules ({campaign.stateRouting.length})</h4>
                      <div className="space-y-1.5">
                        {campaign.stateRouting.map((r, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2">
                            <div>
                              <p className="text-sm font-medium">{r.state}</p>
                              <p className="text-xs text-muted-foreground">→ {r.buyerId.name}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">Priority: {r.priority}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'sources' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium mb-2">Mapped Sources ({campaign.sources.length})</h4>
                  {campaign.sources.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No sources mapped</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {campaign.sources.map((src) => (
                        <Badge key={src} className="bg-secondary text-secondary-foreground capitalize">{src}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="border-t pt-4">
                    <Button variant="outline" size="sm" onClick={() => onEdit(campaign)}>
                      Edit Source Mapping
                    </Button>
                  </div>
                </div>
              )}

              {tab === 'analytics' && <CampaignAnalytics campaign={campaign} />}
            </div>

            <div className="flex items-center gap-2 border-t px-6 py-3">
              <Button variant="outline" size="sm" onClick={() => toggleMutation.mutate()} disabled={toggleMutation.isPending}>
                {campaign.status === 'active' ? 'Deactivate' : 'Activate'}
              </Button>
              <Button size="sm" onClick={() => { onEdit(campaign); onClose() }}>
                Edit Campaign
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium capitalize">{value}</p>
    </div>
  )
}
