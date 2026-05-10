import { useState, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LeadFilters } from '@/components/leads/LeadFilters'
import { LeadTable } from '@/components/leads/LeadTable'
import { LeadDetailDrawer } from '@/components/leads/LeadDetailDrawer'
import { BulkActions } from '@/components/leads/BulkActions'
import type { Lead, LeadFilters as Filters, SortConfig, LeadsResponse } from '@/types/lead'

const DEFAULT_FILTERS: Filters = {}
const DEFAULT_SORT: SortConfig = { key: 'createdAt', direction: 'desc' }

export function LeadsPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [sort, setSort] = useState<SortConfig>(DEFAULT_SORT)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()

  const queryParams = new URLSearchParams()
  queryParams.set('page', page.toString())
  queryParams.set('limit', '25')
  queryParams.set('sort', sort.key)
  queryParams.set('order', sort.direction)
  if (filters.search) queryParams.set('search', filters.search)
  if (filters.status) queryParams.set('status', filters.status)
  if (filters.source) queryParams.set('source', filters.source)
  if (filters.state) queryParams.set('state', filters.state)
  if (filters.buyer) queryParams.set('buyer', filters.buyer)
  if (filters.campaign) queryParams.set('campaign', filters.campaign)
  if (filters.deliveryStatus) queryParams.set('deliveryStatus', filters.deliveryStatus)
  if (filters.dateFrom) queryParams.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) queryParams.set('dateTo', filters.dateTo)

  const { data, isLoading } = useQuery<LeadsResponse>({
    queryKey: [...QUERY_KEYS.LEADS, 'list', { ...filters, ...sort, page }],
    queryFn: async () => {
      const { data } = await api.get(`/leads?${queryParams.toString()}`)
      return data
    },
  })

  const handleFilterChange = useCallback((newFilters: Filters) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setFilters(newFilters)
      setPage(1)
      setSelected(new Set())
    }, 300)
  }, [])

  const handleSortChange = useCallback((newSort: SortConfig) => {
    setSort(newSort)
    setSelected(new Set())
  }, [])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
    setSelected(new Set())
  }, [])

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setSort(DEFAULT_SORT)
    setPage(1)
    setSelected(new Set())
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelected(new Set())
  }, [])

  const handleLeadClick = useCallback((lead: Lead) => {
    setDetailLeadId(lead._id)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setDetailLeadId(null)
  }, [])

  const leads = data?.leads || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage, filter, and route your leads
          </p>
        </div>
        <Button asChild>
          <a href="/leads/add">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
            </svg>
            Add Lead
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <LeadFilters
            filters={filters}
            onChange={handleFilterChange}
            onReset={handleResetFilters}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            All Leads
            {data?.pagination && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({data.pagination.total})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <LeadTable
            data={data}
            isLoading={isLoading}
            sort={sort}
            onSort={handleSortChange}
            selected={selected}
            onSelectionChange={setSelected}
            onPageChange={handlePageChange}
            onLeadClick={handleLeadClick}
          />
        </CardContent>
      </Card>

      <LeadDetailDrawer
        leadId={detailLeadId}
        onClose={handleCloseDetail}
      />

      <BulkActions
        selected={selected}
        leads={leads}
        onClear={handleClearSelection}
      />
    </div>
  )
}
