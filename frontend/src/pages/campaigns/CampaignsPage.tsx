import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/useNotifications'
import { CampaignsTable } from '@/components/campaigns/CampaignsTable'
import { CampaignForm } from '@/components/campaigns/CampaignForm'
import { CampaignDetailDrawer } from '@/components/campaigns/CampaignDetailDrawer'
import { formatNumber, formatPercentage } from '@/lib/utils'
import type { Campaign, CampaignFormData } from '@/types/campaign'

export function CampaignsPage() {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()
  const [showCreate, setShowCreate] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null)

  const { data, isLoading } = useQuery<{ success: boolean; campaigns: Campaign[] }>({
    queryKey: QUERY_KEYS.CAMPAIGNS,
    queryFn: async () => {
      const { data } = await api.get('/campaigns')
      return data
    },
  })

  const campaigns = data?.campaigns || []

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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/campaigns/${id}`)
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Deleted', description: 'Campaign deleted' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS })
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to delete campaign' }),
  })

  const activeCampaigns = campaigns.filter((c) => c.status === 'active')
  const totalLeads = campaigns.reduce((s, c) => s + c.totalLeads, 0)
  const totalConverted = campaigns.reduce((s, c) => s + c.convertedLeads, 0)
  const overallConvRate = totalLeads > 0 ? (totalConverted / totalLeads) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage lead campaigns with routing and source mapping
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          New Campaign
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Campaigns</p>
            <p className="text-2xl font-semibold mt-1">{formatNumber(campaigns.length)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-2xl font-semibold mt-1 text-emerald-600 dark:text-emerald-400">{formatNumber(activeCampaigns.length)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Leads</p>
            <p className="text-2xl font-semibold mt-1">{formatNumber(totalLeads)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Conversion Rate</p>
            <p className="text-2xl font-semibold mt-1">{formatPercentage(overallConvRate)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">All Campaigns</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <CampaignsTable
            campaigns={campaigns}
            isLoading={isLoading}
            onEdit={setSelectedCampaign}
            onToggle={(c) => toggleMutation.mutate(c)}
            onDelete={(c) => {
              if (confirm(`Delete campaign "${c.name}"?`)) deleteMutation.mutate(c._id)
            }}
          />
        </CardContent>
      </Card>

      <CampaignDetailDrawer
        campaign={selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
        onEdit={(c) => {
          setEditCampaign(c)
          setSelectedCampaign(null)
        }}
      />

      {(showCreate || editCampaign) && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => { setShowCreate(false); setEditCampaign(null) }}>
            <div className="absolute inset-0 bg-black/30" />
          </div>
          <div className="fixed top-0 right-0 z-50 h-full w-full max-w-xl border-l bg-background shadow-xl overflow-y-auto">
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
