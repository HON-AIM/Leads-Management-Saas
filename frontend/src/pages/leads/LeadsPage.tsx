import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { LeadDrawer } from '@/components/leads/LeadDrawer'
import { CreateLeadDrawer } from '@/components/leads/CreateLeadDrawer'
import { LeadLogsTable } from '@/components/leads/LeadLogsTable'
import { useNotifications } from '@/hooks/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { getStatusStyle, LEAD_STATUS_COLOR, type SemanticKey } from '@/lib/statusColors'
import { getScoreColor } from '@/lib/statusColors'
import { formatDate } from '@/lib/utils'
import type { Lead, LeadFilters } from '@/types/lead'
import { Search, SlidersHorizontal, X, Users, ChevronLeft, ChevronRight, Plus, ScrollText, Copy, Trash2, RefreshCw, Check } from 'lucide-react'

type Tab = 'leads' | 'logs' | 'duplicates'

export function LeadsPage() {
  const [tab, setTab] = useState<Tab>('leads')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<LeadFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null)
  const [showCreateDrawer, setShowCreateDrawer] = useState(false)
  const [dupPage, setDupPage] = useState(1)
  const [showReviewed, setShowReviewed] = useState(false)
  const qc = useQueryClient()
  const { addNotification } = useNotifications()
  const { isAdmin } = useAuth()

  const hasFilters = Object.values(filters).some(Boolean)

  const queryParams: Record<string, string> = { page: String(page), limit: '25' }
  if (search) queryParams.search = search
  if (filters.status) queryParams.status = filters.status
  if (filters.state) queryParams.state = filters.state
  if (filters.campaign) queryParams.campaignId = filters.campaign
  if (filters.buyer) queryParams.buyerId = filters.buyer
  if (filters.dateFrom) queryParams.startDate = filters.dateFrom
  if (filters.dateTo) queryParams.endDate = filters.dateTo

  const { data, isLoading } = useQuery<{ success: boolean; data: Lead[]; pagination: { total: number; page: number; pages: number } }>({
    queryKey: [...QUERY_KEYS.LEADS, page, search, filters],
    queryFn: async () => {
      const { data } = await api.get('/leads', { params: queryParams })
      return data
    },
    enabled: tab === 'leads',
  })

  const leads = data?.data || []
  const pagination = data?.pagination

  const { data: dupData, isLoading: dupLoading } = useQuery({
    queryKey: ['leads-duplicates', dupPage, showReviewed],
    queryFn: async () => {
      const { data } = await api.get('/leads/duplicates', { params: { page: String(dupPage), limit: '10', showReviewed: String(showReviewed) } })
      return data
    },
    enabled: tab === 'duplicates',
  })

  const dupActionMutation = useMutation({
    mutationFn: async ({ leadId, action }: { leadId: string; action: string }) => {
      const { data } = await api.post(`/leads/${leadId}/duplicate-action`, { action })
      return data
    },
    onSuccess: (data) => {
      addNotification({ type: 'success', title: 'Action completed', description: data?.message || 'Done' })
      qc.invalidateQueries({ queryKey: ['leads-duplicates'] })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.LEADS })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.STATS })
    },
    onError: (err: any) => {
      addNotification({ type: 'error', title: 'Failed', description: err?.response?.data?.error || 'Action failed' })
    },
  })

  const duplicates = dupData?.data || []
  const dupPagination = dupData?.pagination

  const updateFilter = (key: keyof LeadFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({})
    setSearch('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-white tracking-tight">Leads</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {tab === 'leads' && pagination ? `${pagination.total.toLocaleString()} total` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'leads' && (
            <Button size="sm" onClick={() => setShowCreateDrawer(true)}>
              <Plus size={13} className="mr-1" />
              Add Lead
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-white/[0.08] bg-[#0e1428] p-1 w-fit">
        <button
          onClick={() => setTab('leads')}
          className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
            tab === 'leads' ? 'bg-blue-500/15 text-blue-400' : 'text-muted-foreground hover:text-white/70'
          }`}
        >
          <Users size={12} className="inline mr-1.5 -mt-0.5" />
          All Leads
        </button>
        <button
          onClick={() => setTab('logs')}
          className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
            tab === 'logs' ? 'bg-blue-500/15 text-blue-400' : 'text-muted-foreground hover:text-white/70'
          }`}
        >
          <ScrollText size={12} className="inline mr-1.5 -mt-0.5" />
          Logs
        </button>
        <button
          onClick={() => { setTab('duplicates'); setDupPage(1) }}
          className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
            tab === 'duplicates' ? 'bg-blue-500/15 text-blue-400' : 'text-muted-foreground hover:text-white/70'
          }`}
        >
          <Copy size={12} className="inline mr-1.5 -mt-0.5" />
          Duplicates
          {dupData?.pagination?.total > 0 && (
            <span className="ml-1.5 h-4 min-w-[16px] rounded-full bg-amber-500/20 text-amber-300 text-[10px] flex items-center justify-center px-1 inline-flex">{dupData.pagination.total}</span>
          )}
        </button>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search name, email, or phone..."
              className="w-full rounded-lg border border-white/[0.08] bg-[#0e1428] pl-9 pr-3 py-2 text-[13px] text-white placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-colors"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters || hasFilters ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' : ''}
          >
            <SlidersHorizontal size={13} className="mr-1.5" />
            Filters
            {hasFilters && <span className="ml-1.5 h-4 min-w-[16px] rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center px-1">{Object.values(filters).filter(Boolean).length}</span>}
          </Button>
        </div>

        {showFilters && (
          <div className="rounded-lg border border-white/[0.08] bg-[#0e1428] p-4 animate-fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <FilterSelect label="Status" value={filters.status || ''} onChange={(v) => updateFilter('status', v)} options={[
                { label: 'All', value: '' }, { label: 'New', value: 'new' }, { label: 'Assigned', value: 'assigned' },
                { label: 'Delivered', value: 'delivered' }, { label: 'Failed', value: 'failed' },
                { label: 'Duplicate', value: 'duplicate' }, { label: 'Unassigned', value: 'unassigned' },
                { label: 'Merged', value: 'merged' },
              ]} />
              <FilterInput label="State" value={filters.state || ''} onChange={(v) => updateFilter('state', v)} placeholder="TX" />
              <FilterInput label="Campaign" value={filters.campaign || ''} onChange={(v) => updateFilter('campaign', v)} placeholder="Campaign ID" />
              <FilterInput label="Buyer" value={filters.buyer || ''} onChange={(v) => updateFilter('buyer', v)} placeholder="Buyer ID" />
              <FilterInput label="From" value={filters.dateFrom || ''} onChange={(v) => updateFilter('dateFrom', v)} type="date" />
            </div>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-3 flex items-center gap-1 text-[12px] text-blue-400 hover:text-blue-300 transition-colors">
                <X size={12} />
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {tab === 'leads' ? (
        <>
          {/* Table */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] text-muted-foreground uppercase tracking-wider">
                    <th className="text-left font-medium px-6 py-2.5">Lead</th>
                    <th className="text-left font-medium px-6 py-2.5">Campaign</th>
                    <th className="text-left font-medium px-6 py-2.5">Buyer</th>
                    <th className="text-left font-medium px-6 py-2.5">Source</th>
                    <th className="text-left font-medium px-6 py-2.5">State</th>
                    <th className="text-left font-medium px-6 py-2.5">Status</th>
                    <th className="text-left font-medium px-6 py-2.5">Score</th>
                    <th className="text-left font-medium px-6 py-2.5">Created</th>
                    <th className="text-left font-medium px-6 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <>
                      {[...Array(5)].map((_, i) => (
                        <tr key={i} className="border-b border-white/[0.06]">
                          <td className="px-6 py-3"><div className="h-4 w-32 skeleton bg-white/[0.05] rounded" /></td>
                          <td className="px-6 py-3"><div className="h-4 w-20 skeleton bg-white/[0.05] rounded" /></td>
                          <td className="px-6 py-3"><div className="h-4 w-20 skeleton bg-white/[0.05] rounded" /></td>
                          <td className="px-6 py-3"><div className="h-4 w-16 skeleton bg-white/[0.05] rounded" /></td>
                          <td className="px-6 py-3"><div className="h-4 w-8 skeleton bg-white/[0.05] rounded" /></td>
                          <td className="px-6 py-3"><div className="h-4 w-16 skeleton bg-white/[0.05] rounded" /></td>
                          <td className="px-6 py-3"><div className="h-4 w-12 skeleton bg-white/[0.05] rounded" /></td>
                          <td className="px-6 py-3"><div className="h-4 w-24 skeleton bg-white/[0.05] rounded" /></td>
                        </tr>
                      ))}
                    </>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Users size={24} className="text-white/20" />
                          <p className="text-[13px] text-muted-foreground">
                            {search || hasFilters ? 'No leads match your filters' : 'No leads yet'}
                          </p>
                          {(search || hasFilters) && (
                            <button onClick={clearFilters} className="text-[12px] text-blue-400 hover:text-blue-300 transition-colors">
                              Clear filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : leads.map((l) => (
                    <tr
                      key={l._id}
                      className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] cursor-pointer transition-colors"
                      onClick={() => setDrawerLeadId(l._id)}
                    >
                      <td className="px-6 py-3">
                        <p className="font-medium text-white/90">{l.name}</p>
                        <p className="text-[11px] text-muted-foreground">{l.email}</p>
                      </td>
                      <td className="px-6 py-3 text-[12px] text-white/70">
                        {l.campaignId?.name || '—'}
                      </td>
                      <td className="px-6 py-3 text-[12px] text-white/70">
                        {l.buyer?.name || '—'}
                      </td>
                      <td className="px-6 py-3 text-[12px] text-white/70 capitalize">{l.source}</td>
                      <td className="px-6 py-3 text-[12px] text-white/70">{l.state || '—'}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${getStatusStyle(LEAD_STATUS_COLOR[l.status] ?? 'neutral')}`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {l.score != null ? (
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${getScoreColor(l.score)}`}>
                            {l.score}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/50">Not scored</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-[12px] text-white/55">
                        {formatDate(l.createdAt)}
                      </td>
                      <td className="px-6 py-3">
                        {(l.status === 'unassigned' || l.status === 'failed' || l.status === 'new' ||
                          (l.buyer && ['paused', 'inactive', 'full'].includes((l.buyer as any).status))) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDrawerLeadId(l._id) }}
                            className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors font-medium"
                          >
                            Reassign
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-white/[0.06] px-6 py-3">
                <p className="text-[12px] text-muted-foreground">
                  Page {pagination.page} of {pagination.pages}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft size={13} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={page >= pagination.pages}
                  >
                    <ChevronRight size={13} />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <LeadDrawer
            leadId={drawerLeadId}
            onClose={() => setDrawerLeadId(null)}
          />
        </>
      ) : tab === 'logs' ? (
        <LeadLogsTable />
      ) : (
        <DuplicatesTab
          duplicates={duplicates}
          isLoading={dupLoading}
          pagination={dupPagination}
          page={dupPage}
          setDupPage={setDupPage}
          showReviewed={showReviewed}
          setShowReviewed={setShowReviewed}
          onAction={(leadId, action) => dupActionMutation.mutate({ leadId, action })}
          isPending={dupActionMutation.isPending}
          isAdmin={isAdmin}
        />
      )}

      <CreateLeadDrawer
        open={showCreateDrawer}
        onClose={() => setShowCreateDrawer(false)}
      />
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/[0.08] bg-[#0e1428] px-2.5 py-1.5 text-[12px] text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        {options.map((o) => <option key={o.value} value={o.value} className="bg-[#0e1428] text-white">{o.label}</option>)}
      </select>
    </div>
  )
}

function FilterInput({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/[0.08] bg-[#0e1428] px-2.5 py-1.5 text-[12px] text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
    </div>
  )
}

function DuplicatesTab({ duplicates, isLoading, pagination, page, setDupPage, showReviewed, setShowReviewed, onAction, isPending, isAdmin }: {
  duplicates: any[]
  isLoading: boolean
  pagination?: { total: number; page: number; pages: number }
  page: number
  setDupPage: (p: number) => void
  showReviewed: boolean
  setShowReviewed: (v: boolean) => void
  onAction: (leadId: string, action: string) => void
  isPending: boolean
  isAdmin: boolean
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  function handleDelete(leadId: string) {
    if (confirmDeleteId === leadId) {
      onAction(leadId, 'delete_permanently')
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(leadId)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-muted-foreground">
          {pagination ? `${pagination.total} duplicate${pagination.total !== 1 ? 's' : ''} awaiting review` : ''}
        </p>
        <label className="flex items-center gap-2 text-[12px] text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={showReviewed}
            onChange={(e) => setShowReviewed(e.target.checked)}
            className="rounded border-white/[0.2] bg-[#0e1428]"
          />
          Show reviewed
        </label>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 skeleton bg-white/[0.05] rounded-xl" />
          ))}
        </div>
      ) : duplicates.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-2 rounded-xl border border-dashed border-white/[0.12]">
          <Copy size={24} className="text-white/20" />
          <p className="text-[13px] text-muted-foreground">
            {showReviewed ? 'No duplicates found' : 'No pending duplicates to review'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {duplicates.map((dup: any) => {
            const original = dup.duplicateOf
            return (
              <div key={dup._id} className="rounded-xl border border-white/[0.08] bg-[#0e1428] p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Duplicate lead */}
                  <div className="flex-1 rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-3 space-y-1.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 rounded px-1.5 py-0.5">Duplicate</span>
                      <span className="text-[10px] text-muted-foreground">{formatDate(dup.createdAt)}</span>
                    </div>
                    <p className="text-[13px] font-medium text-white">{dup.name}</p>
                    {dup.email && <p className="text-[11px] text-muted-foreground">{dup.email}</p>}
                    {dup.phone && <p className="text-[11px] text-muted-foreground">{dup.phone}</p>}
                    {dup.state && <p className="text-[11px] text-muted-foreground">State: {dup.state}</p>}
                    {dup.campaignId?.name && <p className="text-[11px] text-muted-foreground">Campaign: {dup.campaignId.name}</p>}
                    {dup.status === 'merged' && (
                      <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/15 rounded px-1.5 py-0.5 inline-flex mt-1">Merged</span>
                    )}
                  </div>

                  {/* Original lead */}
                  {original ? (
                    <div className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 space-y-1.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/15 rounded px-1.5 py-0.5">Original</span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(original.createdAt)}</span>
                      </div>
                      <p className="text-[13px] font-medium text-white">{original.name}</p>
                      {original.email && <p className="text-[11px] text-muted-foreground">{original.email}</p>}
                      {original.phone && <p className="text-[11px] text-muted-foreground">{original.phone}</p>}
                      {original.state && <p className="text-[11px] text-muted-foreground">State: {original.state}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">Status:</span>
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${getStatusStyle(LEAD_STATUS_COLOR[original.status] ?? 'neutral')}`}>
                          {original.status}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 flex items-center justify-center">
                      <p className="text-[12px] text-muted-foreground">Original lead not found</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-row lg:flex-col gap-2 lg:justify-center shrink-0">
                    <button
                      onClick={() => onAction(dup._id, 'ignore')}
                      disabled={isPending || dup.status === 'merged'}
                      className="flex items-center gap-1.5 rounded-lg border border-white/[0.10] bg-white/[0.04] px-3 py-2 text-[11px] font-medium text-white/70 hover:bg-white/[0.08] transition-colors disabled:opacity-40"
                    >
                      <Check size={12} />
                      Ignore
                    </button>
                    <button
                      onClick={() => onAction(dup._id, 'reassign')}
                      disabled={isPending || dup.status === 'merged'}
                      className="flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[11px] font-medium text-blue-300 hover:bg-blue-500/20 transition-colors disabled:opacity-40"
                    >
                      <RefreshCw size={12} />
                      Reassign
                    </button>
                    <button
                      onClick={() => onAction(dup._id, 'update_original')}
                      disabled={isPending || dup.status === 'merged' || !original}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
                    >
                      <Copy size={12} />
                      Update Original
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(dup._id)}
                        disabled={isPending || dup.status === 'merged'}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-medium transition-colors disabled:opacity-40 ${
                          confirmDeleteId === dup._id
                            ? 'border-red-500/40 bg-red-500/20 text-red-300 hover:bg-red-500/30'
                            : 'border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        }`}
                      >
                        <Trash2 size={12} />
                        {confirmDeleteId === dup._id ? 'Confirm Delete' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
                {confirmDeleteId === dup._id && (
                  <p className="text-[10px] text-red-400/80 mt-2 ml-1">Click again to confirm permanent deletion. This cannot be undone.</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-muted-foreground">
            Page {pagination.page} of {pagination.pages}
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setDupPage(Math.max(1, page - 1))} disabled={page <= 1}>
              <ChevronLeft size={13} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDupPage(Math.min(pagination.pages, page + 1))} disabled={page >= pagination.pages}>
              <ChevronRight size={13} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
