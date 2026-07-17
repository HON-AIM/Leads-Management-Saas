import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNotifications } from '@/hooks/useNotifications'
import { getStatusStyle, CAMPAIGN_STATUS_COLOR, LEAD_STATUS_COLOR, type SemanticKey } from '@/lib/statusColors'
import { formatDate } from '@/lib/utils'
import { CampaignBuyersTab } from '@/components/campaigns/CampaignBuyersTab'
import { FieldMappingTab } from '@/components/campaigns/FieldMappingTab'
import type { Campaign } from '@/types/campaign'
import {
  ArrowLeft, Copy, Check, Users, DollarSign, TrendingUp,
  BarChart3, ScrollText, Map, Activity, Pencil, Save, X,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'

const TABS = [
  { key: 'overview', label: 'Overview', icon: Activity },
  { key: 'buyers', label: 'Buyers', icon: Users },
  { key: 'field-mapping', label: 'Field Mapping', icon: Map },
  { key: 'leads', label: 'Leads', icon: Users },
  { key: 'costs', label: 'Costs', icon: DollarSign },
  { key: 'insights', label: 'Insights', icon: BarChart3 },
  { key: 'logs', label: 'Logs', icon: ScrollText },
] as const

type TabKey = typeof TABS[number]['key']

export function CampaignWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { addNotification } = useNotifications()
  const [tab, setTab] = useState<TabKey>('overview')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [editingOverview, setEditingOverview] = useState(false)
  const [overviewForm, setOverviewForm] = useState({ name: '', description: '', routingMode: '', costPerLead: 0, dedupWindowHours: 720 })

  const { data: campaign, isLoading } = useQuery<Campaign>({
    queryKey: ['campaign-detail', id],
    queryFn: async () => {
      const { data } = await api.get(`/campaigns/${id}`)
      return data.data ?? data
    },
    enabled: !!id,
  })

  const toggleMutation = useMutation({
    mutationFn: async () => { await api.patch(`/campaigns/${id}/toggle`) },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Toggled', description: `Campaign ${campaign?.status === 'active' ? 'deactivated' : 'activated'}` })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS })
      qc.invalidateQueries({ queryKey: ['campaign-detail', id] })
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to toggle campaign' }),
  })

  const updateMutation = useMutation({
    mutationFn: async (form: typeof overviewForm) => {
      const { data } = await api.put(`/campaigns/${id}`, form)
      return data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Saved', description: 'Campaign updated' })
      qc.invalidateQueries({ queryKey: ['campaign-detail', id] })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS })
      setEditingOverview(false)
    },
    onError: (err: any) => addNotification({ type: 'error', title: 'Error', description: err?.response?.data?.error || 'Failed to update' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => { await api.delete(`/campaigns/${id}`) },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Deleted', description: 'Campaign deleted' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS })
      navigate('/campaigns')
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to delete campaign' }),
  })

  const { data: statsData } = useQuery({
    queryKey: ['campaign-stats', id],
    queryFn: async () => { const { data } = await api.get(`/campaigns/${id}/stats`); return data.data },
    enabled: !!id && tab === 'overview',
  })

  const { data: costsData } = useQuery({
    queryKey: ['campaign-costs', id],
    queryFn: async () => { const { data } = await api.get(`/campaigns/${id}/costs`); return data.data },
    enabled: !!id && tab === 'costs',
  })

  const { data: distributionData } = useQuery({
    queryKey: ['campaign-distribution', id],
    queryFn: async () => { const { data } = await api.get(`/campaigns/${id}/buyer-distribution`); return data.data },
    enabled: !!id && tab === 'insights',
  })

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['campaign-logs', id],
    queryFn: async () => { const { data } = await api.get(`/campaigns/${id}/routing-logs`); return data },
    enabled: !!id && tab === 'logs',
  })

  const [leadsPage, setLeadsPage] = useState(1)
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['campaign-leads', id, leadsPage],
    queryFn: async () => {
      const { data } = await api.get('/leads', { params: { campaignId: id, page: String(leadsPage), limit: '25' } })
      return data
    },
    enabled: !!id && tab === 'leads',
  })

  const routingLabel: Record<string, string> = {
    round_robin: 'Round Robin', weighted: 'Weighted', priority: 'Priority', exclusive: 'Exclusive',
  }

  function copyValue(key: string, value: string) {
    navigator.clipboard.writeText(value)
    setCopiedField(key)
    setTimeout(() => setCopiedField(null), 2000)
  }

  function startEditOverview() {
    if (!campaign) return
    setOverviewForm({
      name: campaign.name,
      description: campaign.description || '',
      routingMode: campaign.routingMode,
      costPerLead: campaign.costPerLead || 0,
      dedupWindowHours: campaign.dedupWindowHours || 720,
    })
    setEditingOverview(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 skeleton bg-white/[0.05] rounded" />
        <div className="h-10 w-96 skeleton bg-white/[0.05] rounded" />
        <div className="h-[400px] skeleton bg-white/[0.05] rounded-xl" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <p className="text-[13px] text-muted-foreground">Campaign not found</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/campaigns')}>
          <ArrowLeft size={14} className="mr-1.5" /> Back to Campaigns
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => navigate('/campaigns')}
            className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-white/70 transition-colors mb-2"
          >
            <ArrowLeft size={13} /> Campaigns
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-[18px] font-semibold text-white tracking-tight truncate">{campaign.name}</h1>
            <Badge className={`text-[10px] px-2 py-0.5 shrink-0 ${getStatusStyle(CAMPAIGN_STATUS_COLOR[campaign.status] ?? 'neutral')}`}>
              {campaign.status}
            </Badge>
          </div>
          {campaign.description && (
            <p className="text-[12px] text-muted-foreground mt-1 truncate">{campaign.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
          >
            {campaign.status === 'active' ? 'Pause' : 'Activate'}
          </Button>
          <Button variant="outline" size="sm" onClick={startEditOverview}>
            <Pencil size={12} className="mr-1" /> Edit
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-white/[0.08] overflow-x-auto -mb-px">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-[12px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.key
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-muted-foreground hover:text-white/70'
              }`}
            >
              <Icon size={13} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div>
        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="space-y-5">
            {editingOverview ? (
              <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold text-white">Edit Campaign</h3>
                  <button onClick={() => setEditingOverview(false)} className="text-muted-foreground hover:text-white transition-colors"><X size={14} /></button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Name</label>
                    <input value={overviewForm.name} onChange={(e) => setOverviewForm({ ...overviewForm, name: e.target.value })}
                      className="w-full rounded-lg border border-white/[0.08] bg-[#0a0f1e] px-3 py-2 text-[13px] text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Routing Mode</label>
                    <select value={overviewForm.routingMode} onChange={(e) => setOverviewForm({ ...overviewForm, routingMode: e.target.value })}
                      className="w-full rounded-lg border border-white/[0.08] bg-[#0a0f1e] px-3 py-2 text-[13px] text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30">
                      <option value="round_robin">Round Robin</option>
                      <option value="weighted">Weighted</option>
                      <option value="priority">Priority</option>
                      <option value="exclusive">Exclusive</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cost Per Lead ($)</label>
                    <input type="number" step="0.01" value={overviewForm.costPerLead} onChange={(e) => setOverviewForm({ ...overviewForm, costPerLead: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-white/[0.08] bg-[#0a0f1e] px-3 py-2 text-[13px] text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Dedup Window (hours)</label>
                    <input type="number" value={overviewForm.dedupWindowHours} onChange={(e) => setOverviewForm({ ...overviewForm, dedupWindowHours: parseInt(e.target.value) || 720 })}
                      className="w-full rounded-lg border border-white/[0.08] bg-[#0a0f1e] px-3 py-2 text-[13px] text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Description</label>
                  <input value={overviewForm.description} onChange={(e) => setOverviewForm({ ...overviewForm, description: e.target.value })}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#0a0f1e] px-3 py-2 text-[13px] text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30" />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditingOverview(false)}>Cancel</Button>
                  <Button variant="cta" size="sm" disabled={!overviewForm.name.trim() || updateMutation.isPending}
                    onClick={() => updateMutation.mutate(overviewForm)}>
                    <Save size={12} className="mr-1" /> {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <StatCard label="Leads Today" value={statsData?.leadsToday ?? campaign.leadsToday ?? 0} />
                  <StatCard label="Total Leads" value={statsData?.totalLeads ?? 0} />
                  <StatCard label="Active Buyers" value={statsData?.activeBuyers ?? 0} />
                  <StatCard label="Delivery Rate" value={`${statsData?.deliveryRate ?? 0}%`} />
                  <StatCard label="Routing" value={routingLabel[campaign.routingMode] || campaign.routingMode} />
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] divide-y divide-white/[0.06]">
                  <InfoRow label="Source" value={campaign.source || 'webhook'} />
                  <InfoRow label="Cost Per Lead" value={`$${campaign.costPerLead ?? 0}`} />
                  <InfoRow label="Dedup Window" value={`${campaign.dedupWindowHours ?? 720}h`} />
                  <InfoRow label="Buyers Assigned" value={`${campaign.assignedBuyers?.length ?? 0}`} />
                  <InfoRow label="Created" value={formatDate(campaign.createdAt)} />
                  {campaign.lastActivityAt && <InfoRow label="Last Activity" value={formatDate(campaign.lastActivityAt)} />}
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] p-4">
                  <h4 className="text-[12px] font-semibold text-white mb-2">Webhook URL</h4>
                  <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                    <p className="text-[11px] font-mono text-white/80 break-all flex-1">
                      {campaign.webhookUrl || 'Not configured'}
                    </p>
                    {campaign.webhookUrl && (
                      <button onClick={() => copyValue('webhook', campaign.webhookUrl)}
                        className="shrink-0 text-muted-foreground hover:text-white transition-colors">
                        {copiedField === 'webhook' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* BUYERS */}
        {tab === 'buyers' && (
          <CampaignBuyersTab campaign={campaign} />
        )}

        {/* FIELD MAPPING */}
        {tab === 'field-mapping' && (
          <FieldMappingTab campaignId={id!} campaign={campaign} />
        )}

        {/* LEADS */}
        {tab === 'leads' && (
          <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] text-muted-foreground uppercase tracking-wider">
                    <th className="text-left font-medium px-6 py-2.5">Lead</th>
                    <th className="text-left font-medium px-6 py-2.5">Buyer</th>
                    <th className="text-left font-medium px-6 py-2.5">Source</th>
                    <th className="text-left font-medium px-6 py-2.5">State</th>
                    <th className="text-left font-medium px-6 py-2.5">Status</th>
                    <th className="text-left font-medium px-6 py-2.5">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {leadsLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b border-white/[0.06]">
                        {[...Array(6)].map((_, j) => (
                          <td key={j} className="px-6 py-3"><div className="h-4 w-20 skeleton bg-white/[0.05] rounded" /></td>
                        ))}
                      </tr>
                    ))
                  ) : (leadsData?.data || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Users size={24} className="text-white/20" />
                          <p className="text-[13px] text-muted-foreground">No leads in this campaign yet</p>
                        </div>
                      </td>
                    </tr>
                  ) : (leadsData?.data || []).map((l: any) => (
                    <tr key={l._id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-medium text-white/90">{l.name}</p>
                        <p className="text-[11px] text-muted-foreground">{l.email}</p>
                      </td>
                      <td className="px-6 py-3 text-[12px] text-white/70">{l.buyer?.name || '—'}</td>
                      <td className="px-6 py-3 text-[12px] text-white/70 capitalize">{l.source}</td>
                      <td className="px-6 py-3 text-[12px] text-white/70">{l.state || '—'}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${getStatusStyle(LEAD_STATUS_COLOR[l.status] ?? 'neutral')}`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-[12px] text-white/55">{formatDate(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {leadsData?.pagination && leadsData.pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-white/[0.06] px-6 py-3">
                <p className="text-[12px] text-muted-foreground">Page {leadsData.pagination.page} of {leadsData.pagination.pages}</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setLeadsPage((p) => Math.max(1, p - 1))} disabled={leadsPage <= 1}>Prev</Button>
                  <Button variant="outline" size="sm" onClick={() => setLeadsPage((p) => Math.min(leadsData.pagination.pages, p + 1))} disabled={leadsPage >= leadsData.pagination.pages}>Next</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* COSTS */}
        {tab === 'costs' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Cost Per Lead" value={`$${costsData?.costPerLead ?? 0}`} />
              <StatCard label="Total Spend" value={`$${(costsData?.totalCost ?? 0).toLocaleString()}`} />
              <StatCard label="Total Revenue" value={`$${(costsData?.totalRevenue ?? 0).toLocaleString()}`} />
              <StatCard label="Net Margin" value={`$${(costsData?.netMargin ?? 0).toLocaleString()}`}
                valueClass={(costsData?.netMargin ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'} />
            </div>
            {costsData?.dailyTrend && costsData.dailyTrend.length > 0 ? (
              <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] p-5">
                <h4 className="text-[12px] font-semibold text-white mb-4">Last 30 Days</h4>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={costsData.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="_id" tick={{ fontSize: 10, fill: 'hsl(215,20%,55%)' }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(215,20%,55%)' }} />
                    <Tooltip
                      contentStyle={{ background: '#151d33', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: 'hsl(215,20%,68%)' }}
                    />
                    <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} dot={false} name="Leads" />
                    <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} dot={false} name="Cost" />
                    <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} name="Revenue" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[20vh] gap-2">
                <DollarSign size={28} className="text-white/20" />
                <p className="text-[13px] text-muted-foreground">No cost data yet</p>
              </div>
            )}
          </div>
        )}

        {/* INSIGHTS */}
        {tab === 'insights' && (
          <div className="space-y-5">
            {distributionData?.fairness && (
              <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] p-4">
                <h4 className="text-[12px] font-semibold text-white mb-2">Round Robin Fairness</h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] text-muted-foreground">Expected per buyer:</span>
                  <span className="text-[13px] font-medium text-white">{distributionData.fairness.expectedPerBuyer}</span>
                  <span className="text-[11px] text-muted-foreground ml-3">Max deviation:</span>
                  <span className={`text-[13px] font-medium ${distributionData.fairness.maxDeviationPct <= 20 ? 'text-emerald-400' : distributionData.fairness.maxDeviationPct <= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                    {distributionData.fairness.maxDeviationPct}%
                  </span>
                </div>
              </div>
            )}
            {distributionData?.distribution && distributionData.distribution.length > 0 ? (
              <>
                <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] p-5">
                  <h4 className="text-[12px] font-semibold text-white mb-4">Leads per Buyer</h4>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={distributionData.distribution.map((d: any) => ({ name: d.buyer?.name || 'Unknown', total: d.total, delivered: d.delivered, failed: d.failed }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(215,20%,55%)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(215,20%,55%)' }} />
                      <Tooltip contentStyle={{ background: '#151d33', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }} />
                      <Bar dataKey="delivered" fill="#10b981" radius={[4, 4, 0, 0]} name="Delivered" />
                      <Bar dataKey="failed" fill="#ef4444" radius={[4, 4, 0, 0]} name="Failed" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] overflow-hidden">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-[10px] text-muted-foreground uppercase tracking-wider">
                        <th className="text-left font-medium px-6 py-2.5">Buyer</th>
                        <th className="text-left font-medium px-6 py-2.5">Total</th>
                        <th className="text-left font-medium px-6 py-2.5">Delivered</th>
                        <th className="text-left font-medium px-6 py-2.5">Failed</th>
                        <th className="text-left font-medium px-6 py-2.5">Success Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distributionData.distribution.map((d: any) => (
                        <tr key={d._id} className="border-b border-white/[0.06] last:border-0">
                          <td className="px-6 py-3">
                            <p className="font-medium text-white/90">{d.buyer?.name || 'Unknown'}</p>
                            <p className="text-[11px] text-muted-foreground">{d.buyer?.email}</p>
                          </td>
                          <td className="px-6 py-3 text-white/75">{d.total}</td>
                          <td className="px-6 py-3 text-emerald-400">{d.delivered}</td>
                          <td className="px-6 py-3 text-red-400">{d.failed}</td>
                          <td className="px-6 py-3 text-white/75">{d.deliveryRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[20vh] gap-2">
                <BarChart3 size={28} className="text-white/20" />
                <p className="text-[13px] text-muted-foreground">No distribution data yet</p>
              </div>
            )}
          </div>
        )}

        {/* LOGS */}
        {tab === 'logs' && (
          <div className="space-y-3">
            {logsLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="h-16 skeleton bg-white/[0.05] rounded-lg" />
              ))
            ) : (logsData?.data || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[20vh] gap-2">
                <ScrollText size={28} className="text-white/20" />
                <p className="text-[13px] text-muted-foreground">No routing logs yet</p>
              </div>
            ) : (
              <>
                {(logsData?.data || []).map((log: any) => (
                  <div key={log._id} className="rounded-lg border border-white/[0.08] px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-white">
                          <span className="font-medium">{log.leadId?.name || 'Lead'}</span>
                          {' → '}
                          <span className="font-medium text-blue-400">{log.selectedBuyerId?.name || 'No buyer'}</span>
                        </p>
                        {log.reason && <p className="text-[11px] text-muted-foreground mt-0.5">{log.reason}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-muted-foreground">{formatDate(log.createdAt)}</p>
                        {log.durationMs != null && <p className="text-[10px] text-muted-foreground/60">{log.durationMs}ms</p>}
                      </div>
                    </div>
                  </div>
                ))}
                {logsData?.pagination && logsData.pagination.pages > 1 && (
                  <div className="flex justify-center pt-2">
                    <p className="text-[12px] text-muted-foreground">Page {logsData.pagination.page} of {logsData.pagination.pages}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, valueClass }: { label: string; value: string | number; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] p-4">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-[16px] font-semibold text-white ${valueClass || ''}`}>{value}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-medium text-white">{value}</span>
    </div>
  )
}
