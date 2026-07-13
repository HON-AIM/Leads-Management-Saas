import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/useNotifications'
import { CampaignCard } from '@/components/campaigns/CampaignCard'
import { CampaignForm } from '@/components/campaigns/CampaignForm'
import type { Campaign, CampaignFormData } from '@/types/campaign'
import { Search, Plus } from 'lucide-react'

export function CampaignsPage() {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()
  const [showCreate, setShowCreate] = useState(false)
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery<{ success: boolean; data: Campaign[] }>({
    queryKey: QUERY_KEYS.CAMPAIGNS,
    queryFn: async () => {
      const { data } = await api.get('/campaigns')
      return data
    },
  })

  const campaigns = data?.data || []

  const createMutation = useMutation({
    mutationFn: async (formData: CampaignFormData) => {
      const { data } = await api.post('/campaigns', formData)
      return data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Created', description: 'Campaign created successfully' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS })
      setShowCreate(false)
    },
    onError: (err: unknown) => {
      const msg = (err as any)?.response?.data?.error || 'Failed to create campaign'
      addNotification({ type: 'error', title: 'Error', description: msg })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (formData: CampaignFormData) => {
      const { data } = await api.put(`/campaigns/${editCampaign!._id}`, formData)
      return data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Updated', description: 'Campaign updated successfully' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS })
      setEditCampaign(null)
    },
    onError: (err: unknown) => {
      const msg = (err as any)?.response?.data?.error || 'Failed to update campaign'
      addNotification({ type: 'error', title: 'Error', description: msg })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async (campaign: Campaign) => {
      await api.patch(`/campaigns/${campaign._id}/toggle`)
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Toggled', description: 'Campaign status changed' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS })
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to toggle campaign' }),
  })

  const filtered = campaigns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.source || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-white tracking-tight">Campaigns</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Manage routing, buyer assignments, and lead flow</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm" variant="cta">
          <Plus size={14} className="mr-1.5" />
          New Campaign
        </Button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search campaigns..."
          className="w-full rounded-lg border border-white/[0.08] bg-[#0e1428] pl-9 pr-3 py-2 text-[13px] text-white/90 placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-colors"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[180px] rounded-xl border border-white/[0.08] bg-[#0e1428] skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.05] mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className="text-[13px] text-muted-foreground">
            {search ? 'No campaigns match your search' : 'No campaigns yet'}
          </p>
          {!search && (
            <Button variant="cta" size="sm" className="mt-3" onClick={() => setShowCreate(true)}>
              Create your first campaign
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CampaignCard
              key={c._id}
              campaign={c}
              onToggle={(c) => toggleMutation.mutate(c)}
            />
          ))}
        </div>
      )}

      {(showCreate || editCampaign) && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => { setShowCreate(false); setEditCampaign(null) }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          </div>
          <div className="fixed top-0 right-0 z-50 h-full w-full max-w-xl border-l border-white/[0.08] bg-[#0e1428] shadow-drawer overflow-y-auto animate-slide-in-right">
            <div className="p-6">
              <CampaignForm
                campaign={editCampaign || undefined}
                onSave={(formData) => editCampaign ? updateMutation.mutate(formData) : createMutation.mutate(formData)}
                onClose={() => { setShowCreate(false); setEditCampaign(null) }}
                isPending={createMutation.isPending || updateMutation.isPending}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
