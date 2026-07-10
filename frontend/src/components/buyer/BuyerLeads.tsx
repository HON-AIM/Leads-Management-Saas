import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { STATUS_STYLES, DELIVERY_STYLES } from '@/types/lead'
import { formatDate } from '@/lib/utils'
import { BuyerLeadDetail } from './BuyerLeadDetail'
import type { Lead } from '@/types/lead'
import type { BuyerLeadsResponse } from '@/types/buyer'

const STATUS_OPTIONS = [
  { label: 'All status', value: '' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'Pending', value: 'pending' },
  { label: 'Unassigned', value: 'unassigned' },
  { label: 'Converted', value: 'converted' },
]

const DELIVERY_OPTIONS = [
  { label: 'All delivery', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Delivering', value: 'delivering' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Failed', value: 'failed' },
]

export function BuyerLeads() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [deliveryStatus, setDeliveryStatus] = useState('')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const { data, isLoading } = useQuery<BuyerLeadsResponse>({
    queryKey: [...QUERY_KEYS.LEADS, 'buyer', { page, search, status, deliveryStatus }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' })
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (deliveryStatus) params.set('deliveryStatus', deliveryStatus)
      const { data } = await api.get(`/buyer/leads?${params.toString()}`)
      return data
    },
  })

  const leads = data?.leads || []
  const stats = data?.stats
  const pages = data?.pagination?.pages || 0

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleStatusChange = (value: string) => {
    setStatus(value)
    setPage(1)
  }

  const handleDeliveryChange = (value: string) => {
    setDeliveryStatus(value)
    setPage(1)
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <Input
          placeholder="Search leads..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <Select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          options={STATUS_OPTIONS}
        />
        <Select
          value={deliveryStatus}
          onChange={(e) => handleDeliveryChange(e.target.value)}
          options={DELIVERY_OPTIONS}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-semibold">{stats?.total ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-lg font-semibold">{stats?.pending ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">In Progress</p>
          <p className="text-lg font-semibold">{stats?.inProgress ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Delivered</p>
          <p className="text-lg font-semibold">{stats?.delivered ?? 0}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/60 py-10 text-center text-sm text-muted-foreground">
          {search || status || deliveryStatus ? 'No matching leads' : 'No leads assigned yet'}
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => (
            <button
              key={lead._id}
              onClick={() => setSelectedLead(lead)}
              className="w-full text-left rounded-xl border bg-card p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{lead.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                </div>
                <Badge className={`${STATUS_STYLES[lead.status] || ''} shrink-0`}>{lead.status}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{lead.state}</span>
                <span>•</span>
                <span>{lead.source}</span>
                {lead.campaign && <><span>•</span><span>{lead.campaign}</span></>}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <Badge className={`${DELIVERY_STYLES[lead.deliveryStatus] || ''}`}>{lead.deliveryStatus}</Badge>
                <span className="text-muted-foreground">{formatDate(lead.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
          <span className="text-xs text-muted-foreground">{page} / {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}

      <BuyerLeadDetail lead={selectedLead} onClose={() => setSelectedLead(null)} />
    </div>
  )
}
