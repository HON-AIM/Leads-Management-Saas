import { lazy, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import { formatNumber } from '@/lib/utils'
import { getStatusStyle, DELIVERY_STATUS_COLOR, SEMANTIC_COLORS } from '@/lib/statusColors'
import { Users, CheckCircle2, XCircle, Building2 } from 'lucide-react'

const LeadActivityChart = lazy(() =>
  import('@/components/dashboard/LeadActivityChart').then((m) => ({ default: m.LeadActivityChart }))
)

interface Overview {
  totalLeads: number
  todayLeads: number
  activeBuyers: number
  leads: { pending: number; routed: number; delivered: number; failed: number; duplicate: number }
  delivery: { total: number; delivered: number; failed: number }
  recentAssignments: any[]
}

interface BuyerStat {
  _id: string
  name: string
  total: number
  delivered: number
  failed: number
}

interface TrendPoint {
  _id: string
  count: number
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton bg-white/[0.05] ${className || ''}`} />
}

function KpiCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] p-5 transition-all duration-200 hover:border-white/[0.12]">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] text-muted-foreground font-medium">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
      <p className="text-[22px] font-semibold text-white tracking-tight">{formatNumber(value)}</p>
    </div>
  )
}

function BuyerRow({ buyer }: { buyer: BuyerStat }) {
  const sc = buyer.failed > 0 ? SEMANTIC_COLORS.caution : SEMANTIC_COLORS.positive
  const statusColor = `${sc.bg} ${sc.text} ${sc.ring}`
  const statusLabel = buyer.failed > 0 ? 'Issues' : 'Healthy'

  return (
    <tr className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors">
      <td className="py-3 px-6 text-[13px] text-white/90 font-medium">{buyer.name}</td>
      <td className="py-3 px-6 text-[13px] text-white/75 text-center">{formatNumber(buyer.delivered)}</td>
      <td className="py-3 px-6 text-[13px] text-white/75 text-center">{formatNumber(buyer.total)}</td>
      <td className="py-3 px-6 text-[13px] text-white/75 text-center">—</td>
      <td className="py-3 px-6 text-center">
        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${statusColor}`}>
          {statusLabel}
        </span>
      </td>
    </tr>
  )
}

function RecentLeadRow({ assignment }: { assignment: any }) {
  const lead = assignment.leadId || {}
  const buyer = assignment.buyerId || {}

  const statusColor = getStatusStyle(assignment.status, DELIVERY_STATUS_COLOR)

  return (
    <tr className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors">
      <td className="py-2.5 px-6 text-[12px]">
        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${statusColor}`}>
          {assignment.status}
        </span>
      </td>
      <td className="py-2.5 px-6 text-[12px] text-white/80">{buyer.name || '—'}</td>
      <td className="py-2.5 px-6 text-[12px] text-white/60">—</td>
      <td className="py-2.5 px-6 text-[12px] text-white/60">{lead.state || '—'}</td>
      <td className="py-2.5 px-6 text-[12px] text-white/55">
        {assignment.createdAt ? new Date(assignment.createdAt).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        }) : '—'}
      </td>
    </tr>
  )
}

export function DashboardPage() {
  const { user } = useAuth()

  const { data: overview, isLoading: overviewLoading } = useQuery<Overview>({
    queryKey: QUERY_KEYS.STATS,
    queryFn: async () => {
      const { data } = await api.get('/dashboard/overview')
      return data.data
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  const { data: buyerStats } = useQuery<BuyerStat[]>({
    queryKey: QUERY_KEYS.BUYER_DISTRIBUTION,
    queryFn: async () => {
      const { data } = await api.get('/dashboard/buyer-stats')
      return data.data
    },
    staleTime: 30_000,
  })

  const { data: trend } = useQuery<TrendPoint[]>({
    queryKey: ['lead-trend'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/lead-trend?days=14')
      return data.data
    },
    staleTime: 30_000,
  })

  const delivered = overview?.delivery?.delivered ?? 0
  const failed = overview?.delivery?.failed ?? 0
  const total = overview?.totalLeads ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[18px] font-semibold text-white tracking-tight">Dashboard</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
        </p>
      </div>

      {/* KPI Cards */}
      {overviewLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonBlock key={i} className="h-[108px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total Leads"
            value={total}
            icon={<Users size={15} className="text-blue-400" />}
            color="bg-blue-500/10"
          />
          <KpiCard
            label="Delivered"
            value={delivered}
            icon={<CheckCircle2 size={15} className="text-emerald-400" />}
            color="bg-emerald-500/10"
          />
          <KpiCard
            label="Failed"
            value={failed}
            icon={<XCircle size={15} className="text-red-400" />}
            color="bg-red-500/10"
          />
          <KpiCard
            label="Active Buyers"
            value={overview?.activeBuyers ?? 0}
            icon={<Building2 size={15} className="text-amber-400" />}
            color="bg-amber-500/10"
          />
        </div>
      )}

      {/* Chart */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] p-6">
        <h3 className="text-[13px] font-semibold text-white mb-4">Lead Activity</h3>
        <Suspense fallback={<SkeletonBlock className="h-[220px] w-full" />}>
          {trend ? <LeadActivityChart data={trend} /> : <SkeletonBlock className="h-[220px] w-full" />}
        </Suspense>
      </div>

      {/* Buyer Distribution */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h3 className="text-[13px] font-semibold text-white">Buyer Distribution</h3>
          <span className="text-[11px] text-muted-foreground">{buyerStats?.length ?? 0} buyers</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-2.5 text-left font-medium">Buyer</th>
                <th className="px-6 py-2.5 text-center font-medium">Delivered</th>
                <th className="px-6 py-2.5 text-center font-medium">Total</th>
                <th className="px-6 py-2.5 text-center font-medium">Cap</th>
                <th className="px-6 py-2.5 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {buyerStats && buyerStats.length > 0 ? (
                buyerStats.map((b) => <BuyerRow key={b._id} buyer={b} />)
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 size={20} className="text-white/20" />
                      <p className="text-[12px] text-muted-foreground">No buyer data yet</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Leads */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h3 className="text-[13px] font-semibold text-white">Recent Leads</h3>
          <span className="text-[11px] text-muted-foreground">Latest 10</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-2.5 text-left font-medium">Status</th>
                <th className="px-6 py-2.5 text-left font-medium">Buyer</th>
                <th className="px-6 py-2.5 text-left font-medium">Campaign</th>
                <th className="px-6 py-2.5 text-left font-medium">State</th>
                <th className="px-6 py-2.5 text-left font-medium">Received</th>
              </tr>
            </thead>
            <tbody>
              {overview?.recentAssignments && overview.recentAssignments.length > 0 ? (
                overview.recentAssignments.map((a: any, i: number) => (
                  <RecentLeadRow key={a._id || i} assignment={a} />
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users size={20} className="text-white/20" />
                      <p className="text-[12px] text-muted-foreground">No leads yet</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
