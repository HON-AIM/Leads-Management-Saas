import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { LeadDrawer } from '@/components/leads/LeadDrawer'
import { CreateLeadDrawer } from '@/components/leads/CreateLeadDrawer'
import { LeadLogsTable } from '@/components/leads/LeadLogsTable'
import { getStatusStyle, LEAD_STATUS_COLOR, type SemanticKey } from '@/lib/statusColors'
import { formatDate } from '@/lib/utils'
import type { Lead, LeadFilters } from '@/types/lead'
import { Search, SlidersHorizontal, X, Users, ChevronLeft, ChevronRight, Plus, ScrollText } from 'lucide-react'

type Tab = 'leads' | 'logs'

export function LeadsPage() {
  const [tab, setTab] = useState<Tab>('leads')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<LeadFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null)
  const [showCreateDrawer, setShowCreateDrawer] = useState(false)

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
    <div className="space-y-5">
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
                          <td className="px-6 py-3"><div className="h-4 w-24 skeleton bg-white/[0.05] rounded" /></td>
                        </tr>
                      ))}
                    </>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
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
                      <td className="px-6 py-3 text-[12px] text-white/55">
                        {formatDate(l.createdAt)}
                      </td>
                      <td className="px-6 py-3">
                        {l.status === 'unassigned' && (
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
      ) : (
        <LeadLogsTable />
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
