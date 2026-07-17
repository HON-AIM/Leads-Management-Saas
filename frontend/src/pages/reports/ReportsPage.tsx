import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { formatNumber, formatPercentage } from '@/lib/utils'
import { SEMANTIC_COLORS, getStatusStyle, DELIVERY_STATUS_COLOR } from '@/lib/statusColors'
import {
  BarChart3, Users, CheckCircle2, XCircle, TrendingUp,
  Download, Clock, Copy, Building2, ArrowUpRight, Activity,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface Overview {
  totalLeads: number
  totalAssignments: number
  delivered: number
  failed: number
  returned: number
  pending: number
  dupeCount: number
  successRate: number
  duplicateRate: number
  avgDeliveryMs: number
  revenue: number
  cost: number
}

interface VolumePoint {
  date: string
  total: number
  new: number
  delivered: number
  failed: number
}

interface BuyerDist {
  _id: string
  name: string
  total: number
  delivered: number
  failed: number
  revenue: number
  cost: number
}

interface CampaignPerf {
  _id: string
  name: string
  routingMode: string
  total: number
  delivered: number
  failed: number
  revenue: number
  cost: number
  successRate: number
}

interface TopBuyer {
  _id: string
  name: string
  total: number
  delivered: number
  failed: number
  revenue: number
  cost: number
  avgDeliveryMs: number
  successRate: number
}

type Tab = 'overview' | 'volume' | 'buyers' | 'campaigns' | 'top-buyers'

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'volume', label: 'Lead Volume' },
  { key: 'buyers', label: 'Buyer Distribution' },
  { key: 'campaigns', label: 'Campaign Performance' },
  { key: 'top-buyers', label: 'Top Buyers' },
]

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton bg-white/[0.05] ${className || ''}`} />
}

function KpiCard({ label, value, icon, color, sub }: {
  label: string; value: string; icon: React.ReactNode; color: string; sub?: string
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] p-5 transition-all duration-200 hover:border-white/[0.12]">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] text-muted-foreground font-medium">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>{icon}</div>
      </div>
      <p className="text-[22px] font-semibold text-white tracking-tight">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

function CsvButton({ view, days }: { view: string; days?: number }) {
  const url = `/api/reports/export/${view}${days ? `?days=${days}` : ''}`
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/70 hover:bg-white/[0.08] hover:text-white transition-colors"
    >
      <Download size={13} />
      Export CSV
    </a>
  )
}

const chartTooltipStyle = {
  contentStyle: {
    background: '#0e1428',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#fff',
  },
}

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [volumeDays, setVolumeDays] = useState(30)

  const { data: overview, isLoading: overviewLoading } = useQuery<Overview>({
    queryKey: [...QUERY_KEYS.REPORTS, 'overview'],
    queryFn: async () => { const { data } = await api.get('/reports/overview'); return data.data },
    staleTime: 30_000,
  })

  const { data: volume, isLoading: volumeLoading } = useQuery<VolumePoint[]>({
    queryKey: [...QUERY_KEYS.REPORTS, 'volume', volumeDays],
    queryFn: async () => { const { data } = await api.get(`/reports/lead-volume?days=${volumeDays}`); return data.data },
    staleTime: 30_000,
    enabled: activeTab === 'volume',
  })

  const { data: buyerDist, isLoading: buyerLoading } = useQuery<BuyerDist[]>({
    queryKey: [...QUERY_KEYS.REPORTS, 'buyer-distribution'],
    queryFn: async () => { const { data } = await api.get('/reports/buyer-distribution'); return data.data },
    staleTime: 30_000,
    enabled: activeTab === 'buyers' || activeTab === 'top-buyers',
  })

  const { data: campaignPerf, isLoading: campaignLoading } = useQuery<CampaignPerf[]>({
    queryKey: [...QUERY_KEYS.REPORTS, 'campaign-performance'],
    queryFn: async () => { const { data } = await api.get('/reports/campaign-performance'); return data.data },
    staleTime: 30_000,
    enabled: activeTab === 'campaigns',
  })

  const { data: topBuyers, isLoading: topLoading } = useQuery<TopBuyer[]>({
    queryKey: [...QUERY_KEYS.REPORTS, 'top-buyers'],
    queryFn: async () => { const { data } = await api.get('/reports/top-buyers'); return data.data },
    staleTime: 30_000,
    enabled: activeTab === 'top-buyers',
  })

  const fmtMs = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-white tracking-tight">Reports</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Analytics across leads, buyers, and campaigns
          </p>
        </div>
        <CsvButton view={activeTab} days={activeTab === 'volume' ? volumeDays : undefined} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#0e1428] p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-500/15 text-blue-400'
                : 'text-muted-foreground hover:text-white/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {overviewLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => <SkeletonBlock key={i} className="h-[108px] rounded-xl" />)}
            </div>
          ) : overview && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Total Leads"
                value={formatNumber(overview.totalLeads)}
                icon={<Users size={15} className="text-blue-400" />}
                color="bg-blue-500/10"
              />
              <KpiCard
                label="Delivery Success"
                value={formatPercentage(overview.successRate)}
                icon={<CheckCircle2 size={15} className="text-emerald-400" />}
                color="bg-emerald-500/10"
                sub={`${formatNumber(overview.delivered)} of ${formatNumber(overview.totalAssignments)} delivered`}
              />
              <KpiCard
                label="Duplicate Rate"
                value={formatPercentage(overview.duplicateRate)}
                icon={<Copy size={15} className="text-amber-400" />}
                color="bg-amber-500/10"
                sub={`${formatNumber(overview.dupeCount)} duplicates`}
              />
              <KpiCard
                label="Avg Delivery Time"
                value={fmtMs(overview.avgDeliveryMs)}
                icon={<Clock size={15} className="text-violet-400" />}
                color="bg-violet-500/10"
                sub="Successful deliveries"
              />
            </div>
          )}

          {overview && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Delivered"
                value={formatNumber(overview.delivered)}
                icon={<ArrowUpRight size={15} className="text-emerald-400" />}
                color="bg-emerald-500/10"
              />
              <KpiCard
                label="Failed"
                value={formatNumber(overview.failed)}
                icon={<XCircle size={15} className="text-red-400" />}
                color="bg-red-500/10"
              />
              <KpiCard
                label="Revenue"
                value={`$${formatNumber(overview.revenue)}`}
                icon={<TrendingUp size={15} className="text-emerald-400" />}
                color="bg-emerald-500/10"
              />
              <KpiCard
                label="Cost"
                value={`$${formatNumber(overview.cost)}`}
                icon={<Activity size={15} className="text-amber-400" />}
                color="bg-amber-500/10"
              />
            </div>
          )}
        </>
      )}

      {/* Lead Volume Tab */}
      {activeTab === 'volume' && (
        <div className="space-y-4">
          <div className="flex items-center gap-1">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setVolumeDays(d)}
                className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  volumeDays === d ? 'bg-blue-500/15 text-blue-400' : 'text-muted-foreground hover:text-white/70'
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] p-6">
            <h3 className="text-[13px] font-semibold text-white mb-4">Lead Volume Over Time</h3>
            {volumeLoading ? (
              <SkeletonBlock className="h-[300px] w-full" />
            ) : volume && volume.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={volume}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} />
                  <Tooltip {...chartTooltipStyle} />
                  <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="url(#colorTotal)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-[13px] text-muted-foreground">No data</div>
            )}
          </div>
        </div>
      )}

      {/* Buyer Distribution Tab */}
      {activeTab === 'buyers' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] p-6">
            <h3 className="text-[13px] font-semibold text-white mb-4">Buyer Distribution</h3>
            {buyerLoading ? (
              <SkeletonBlock className="h-[300px] w-full" />
            ) : buyerDist && buyerDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={buyerDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} />
                  <Tooltip {...chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
                  <Bar dataKey="delivered" fill="#10b981" radius={[4, 4, 0, 0]} name="Delivered" />
                  <Bar dataKey="failed" fill="#ef4444" radius={[4, 4, 0, 0]} name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-[13px] text-muted-foreground">No data</div>
            )}
          </div>

          {/* Buyer Table */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] text-muted-foreground uppercase tracking-wider">
                    <th className="px-6 py-2.5 text-left font-medium">Buyer</th>
                    <th className="px-6 py-2.5 text-center font-medium">Total</th>
                    <th className="px-6 py-2.5 text-center font-medium">Delivered</th>
                    <th className="px-6 py-2.5 text-center font-medium">Failed</th>
                    <th className="px-6 py-2.5 text-center font-medium">Success Rate</th>
                    <th className="px-6 py-2.5 text-center font-medium">Revenue</th>
                    <th className="px-6 py-2.5 text-center font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {buyerDist?.map((b) => {
                    const rate = b.total > 0 ? (b.delivered / b.total) * 100 : 0
                    const sc = rate >= 90 ? SEMANTIC_COLORS.positive : rate >= 70 ? SEMANTIC_COLORS.caution : SEMANTIC_COLORS.negative
                    return (
                      <tr key={b._id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors">
                        <td className="py-3 px-6 text-[13px] text-white/90 font-medium">{b.name || 'Unknown'}</td>
                        <td className="py-3 px-6 text-[13px] text-white/75 text-center">{formatNumber(b.total)}</td>
                        <td className="py-3 px-6 text-[13px] text-emerald-400 text-center">{formatNumber(b.delivered)}</td>
                        <td className="py-3 px-6 text-[13px] text-red-400 text-center">{formatNumber(b.failed)}</td>
                        <td className="py-3 px-6 text-center">
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${sc.bg} ${sc.text} ${sc.ring}`}>
                            {formatPercentage(rate)}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-[13px] text-white/60 text-center">${formatNumber(b.revenue || 0)}</td>
                        <td className="py-3 px-6 text-[13px] text-white/60 text-center">${formatNumber(b.cost || 0)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Performance Tab */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] p-6">
            <h3 className="text-[13px] font-semibold text-white mb-4">Campaign Comparison</h3>
            {campaignLoading ? (
              <SkeletonBlock className="h-[300px] w-full" />
            ) : campaignPerf && campaignPerf.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={campaignPerf}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} />
                  <Tooltip {...chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
                  <Bar dataKey="delivered" fill="#10b981" radius={[4, 4, 0, 0]} name="Delivered" />
                  <Bar dataKey="failed" fill="#ef4444" radius={[4, 4, 0, 0]} name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-[13px] text-muted-foreground">No data</div>
            )}
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] text-muted-foreground uppercase tracking-wider">
                    <th className="px-6 py-2.5 text-left font-medium">Campaign</th>
                    <th className="px-6 py-2.5 text-center font-medium">Routing</th>
                    <th className="px-6 py-2.5 text-center font-medium">Total</th>
                    <th className="px-6 py-2.5 text-center font-medium">Delivered</th>
                    <th className="px-6 py-2.5 text-center font-medium">Failed</th>
                    <th className="px-6 py-2.5 text-center font-medium">Success Rate</th>
                    <th className="px-6 py-2.5 text-center font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignPerf?.map((c) => {
                    const sc = c.successRate >= 90 ? SEMANTIC_COLORS.positive : c.successRate >= 70 ? SEMANTIC_COLORS.caution : SEMANTIC_COLORS.negative
                    return (
                      <tr key={c._id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors">
                        <td className="py-3 px-6 text-[13px] text-white/90 font-medium">{c.name || 'Unknown'}</td>
                        <td className="py-3 px-6 text-[12px] text-white/60 text-center capitalize">{c.routingMode?.replace('_', '-') || '—'}</td>
                        <td className="py-3 px-6 text-[13px] text-white/75 text-center">{formatNumber(c.total)}</td>
                        <td className="py-3 px-6 text-[13px] text-emerald-400 text-center">{formatNumber(c.delivered)}</td>
                        <td className="py-3 px-6 text-[13px] text-red-400 text-center">{formatNumber(c.failed)}</td>
                        <td className="py-3 px-6 text-center">
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${sc.bg} ${sc.text} ${sc.ring}`}>
                            {formatPercentage(c.successRate)}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-[13px] text-white/60 text-center">${formatNumber(c.revenue || 0)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Top Buyers Tab */}
      {activeTab === 'top-buyers' && (
        <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <h3 className="text-[13px] font-semibold text-white">Top Performing Buyers</h3>
            <span className="text-[11px] text-muted-foreground">Ranked by delivered leads</span>
          </div>
          {topLoading ? (
            <div className="p-6"><SkeletonBlock className="h-[300px] w-full" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] text-muted-foreground uppercase tracking-wider">
                    <th className="px-6 py-2.5 text-left font-medium">#</th>
                    <th className="px-6 py-2.5 text-left font-medium">Buyer</th>
                    <th className="px-6 py-2.5 text-center font-medium">Total</th>
                    <th className="px-6 py-2.5 text-center font-medium">Delivered</th>
                    <th className="px-6 py-2.5 text-center font-medium">Failed</th>
                    <th className="px-6 py-2.5 text-center font-medium">Success Rate</th>
                    <th className="px-6 py-2.5 text-center font-medium">Avg Delivery</th>
                    <th className="px-6 py-2.5 text-center font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topBuyers?.map((b, i) => {
                    const sc = b.successRate >= 90 ? SEMANTIC_COLORS.positive : b.successRate >= 70 ? SEMANTIC_COLORS.caution : SEMANTIC_COLORS.negative
                    return (
                      <tr key={b._id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors">
                        <td className="py-3 px-6 text-[12px] text-muted-foreground font-medium">{i + 1}</td>
                        <td className="py-3 px-6 text-[13px] text-white/90 font-medium">{b.name || 'Unknown'}</td>
                        <td className="py-3 px-6 text-[13px] text-white/75 text-center">{formatNumber(b.total)}</td>
                        <td className="py-3 px-6 text-[13px] text-emerald-400 text-center">{formatNumber(b.delivered)}</td>
                        <td className="py-3 px-6 text-[13px] text-red-400 text-center">{formatNumber(b.failed)}</td>
                        <td className="py-3 px-6 text-center">
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${sc.bg} ${sc.text} ${sc.ring}`}>
                            {formatPercentage(b.successRate)}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-[13px] text-white/60 text-center">{fmtMs(b.avgDeliveryMs)}</td>
                        <td className="py-3 px-6 text-[13px] text-white/60 text-center">${formatNumber(b.revenue || 0)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
