import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNotifications } from '@/hooks/useNotifications'
import { getStatusStyle, BUYER_STATUS_COLOR, type SemanticKey } from '@/lib/statusColors'
import type { Campaign } from '@/types/campaign'
import type { Buyer } from '@/types/buyer'
import { UserPlus, X } from 'lucide-react'

interface CampaignBuyersTabProps {
  campaign: Campaign
}

export function CampaignBuyersTab({ campaign }: CampaignBuyersTabProps) {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()

  const { data: buyersData } = useQuery({
    queryKey: QUERY_KEYS.BUYERS,
    queryFn: async () => {
      const { data } = await api.get('/buyers')
      return data.data ?? data.buyers ?? data ?? []
    },
  })
  const allBuyers: Buyer[] = Array.isArray(buyersData) ? buyersData : []

  const assignedBuyerIds = (campaign.assignedBuyers || []).map((b: any) => typeof b.buyerId === 'object' ? b.buyerId._id : b.buyerId)
  const availableBuyers = allBuyers.filter((b) => b.status === 'active' && !assignedBuyerIds.includes(b._id))

  const addBuyerMutation = useMutation({
    mutationFn: async (buyerId: string) => {
      const { data } = await api.post(`/campaigns/${campaign._id}/buyers`, { buyerId, weight: 1, priority: 0 })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS })
      qc.invalidateQueries({ queryKey: ['campaign-detail', campaign._id] })
      addNotification({ type: 'success', title: 'Buyer added', description: 'Buyer has been assigned to this campaign.' })
    },
    onError: (err: any) => {
      addNotification({ type: 'error', title: 'Failed', description: err?.response?.data?.error || 'Could not add buyer.' })
    },
  })

  const removeBuyerMutation = useMutation({
    mutationFn: async (buyerId: string) => {
      await api.delete(`/campaigns/${campaign._id}/buyers/${buyerId}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS })
      qc.invalidateQueries({ queryKey: ['campaign-detail', campaign._id] })
      addNotification({ type: 'success', title: 'Buyer removed', description: 'Buyer has been unassigned from this campaign.' })
    },
    onError: (err: any) => {
      addNotification({ type: 'error', title: 'Failed', description: err?.response?.data?.error || 'Could not remove buyer.' })
    },
  })

  const updateBuyerStatusMutation = useMutation({
    mutationFn: async ({ buyerId, status }: { buyerId: string; status: string }) => {
      await api.patch(`/buyers/${buyerId}/status`, { status })
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Updated', description: 'Buyer status updated' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS })
      qc.invalidateQueries({ queryKey: ['campaign-next-buyer', campaign._id] })
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to update buyer status' }),
  })

  const { data: nextBuyerData } = useQuery({
    queryKey: ['campaign-next-buyer', campaign._id],
    queryFn: async () => {
      const { data } = await api.get(`/campaigns/${campaign._id}/next-buyer`)
      return data.data ?? data
    },
    enabled: campaign.routingMode === 'round_robin',
    refetchInterval: 15000,
  })

  return (
    <div className="space-y-4">
      {campaign.routingMode === 'round_robin' && (
        <p className="text-[11px] text-muted-foreground bg-white/[0.03] rounded-lg px-3 py-2 border border-white/[0.06]">
          Buyers rotate in order. The buyer marked NEXT will receive the next incoming lead, assuming they remain eligible when it arrives.
        </p>
      )}

      {availableBuyers.length > 0 && (
        <div className="flex items-center gap-2">
          <UserPlus size={14} className="text-muted-foreground shrink-0" />
          <select
            className="flex-1 text-xs border border-white/[0.15] rounded-lg px-3 py-2 bg-[#151d33] text-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 cursor-pointer"
            style={{ colorScheme: 'dark' }}
            value=""
            onChange={(e) => {
              if (e.target.value) {
                addBuyerMutation.mutate(e.target.value)
                e.target.value = ''
              }
            }}
          >
            <option value="" className="bg-[#151d33] text-white/60">Add buyer to campaign...</option>
            {availableBuyers.map((b) => (
              <option key={b._id} value={b._id} className="bg-[#151d33] text-white">{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {(!campaign.assignedBuyers || campaign.assignedBuyers.length === 0) ? (
        <div className="text-center py-10 rounded-lg border border-dashed border-white/[0.12]">
          <p className="text-[13px] text-muted-foreground mb-3">No buyers assigned to this campaign</p>
        </div>
      ) : (
        <div className="space-y-2">
          {campaign.assignedBuyers.map((b: any, i: number) => {
            const buyer = typeof b.buyerId === 'object' ? b.buyerId : allBuyers.find((ab) => ab._id === b.buyerId)
            const buyerId = typeof b.buyerId === 'object' ? b.buyerId._id : b.buyerId
            return (
              <div key={i} className="rounded-lg border border-white/[0.08] p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[13px] font-semibold text-white">{buyer?.name || 'Unknown Buyer'}</p>
                  <div className="flex items-center gap-2">
                    {campaign.routingMode === 'round_robin' && nextBuyerData?.nextBuyerId === buyerId && (
                      <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold bg-violet-500/15 text-violet-300 ring-1 ring-inset ring-violet-400/40 uppercase tracking-wide">
                        <span className="w-1 h-1 rounded-full bg-violet-400 animate-pulse" />
                        Next
                      </span>
                    )}
                    {buyer?.status && (
                      <Badge className={`text-[10px] px-2 py-0.5 ${getStatusStyle(BUYER_STATUS_COLOR[buyer.status] ?? 'neutral')}`}>{buyer.status}</Badge>
                    )}
                    <button
                      onClick={() => removeBuyerMutation.mutate(buyerId)}
                      disabled={removeBuyerMutation.isPending}
                      className="text-muted-foreground hover:text-red-400 transition-colors p-0.5"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                {buyer?.email && <p className="text-[11px] text-muted-foreground mb-0.5">{buyer.email}</p>}
                {buyer && (
                  <div className="mt-2 space-y-1.5">
                    {buyer.leadCap > 0 && (
                      <CapBar label="Total" received={buyer.leadsReceived} cap={buyer.leadCap} />
                    )}
                    {buyer.dailyCap > 0 && (
                      <CapBar label="Daily" received={buyer.dailyLeadsReceived} cap={buyer.dailyCap} />
                    )}
                    {buyer.monthlyCap > 0 && (
                      <CapBar label="Monthly" received={buyer.monthlyLeadsReceived} cap={buyer.monthlyCap} />
                    )}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground/60 italic mt-1.5">Status changes apply to this buyer across all campaigns</p>
                <div className="flex gap-4 mt-2 text-[11px] text-muted-foreground">
                  {campaign.routingMode === 'weighted' && <span>Weight: {b.weight}</span>}
                  {campaign.routingMode === 'priority' && <span>Priority: {b.priority}</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  {buyer?.status !== 'active' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); updateBuyerStatusMutation.mutate({ buyerId, status: 'active' }) }}
                      disabled={updateBuyerStatusMutation.isPending}
                      className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                    >
                      Activate
                    </button>
                  )}
                  {buyer?.status !== 'paused' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); updateBuyerStatusMutation.mutate({ buyerId, status: 'paused' }) }}
                      disabled={updateBuyerStatusMutation.isPending}
                      className="text-[10px] px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                    >
                      Pause
                    </button>
                  )}
                  {buyer?.status !== 'inactive' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); updateBuyerStatusMutation.mutate({ buyerId, status: 'inactive' }) }}
                      disabled={updateBuyerStatusMutation.isPending}
                      className="text-[10px] px-2 py-1 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CapBar({ label, received, cap }: { label: string; received: number; cap: number }) {
  const pct = Math.min((received / cap) * 100, 100)
  const barColor = pct >= 100 ? 'bg-red-400' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'
  const textColor = pct >= 100 ? 'text-red-300' : pct >= 80 ? 'text-amber-300' : 'text-emerald-300'

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-12 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-medium ${textColor} shrink-0 w-16 text-right`}>{received}/{cap}</span>
    </div>
  )
}
