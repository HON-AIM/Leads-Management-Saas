import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { STATUS_STYLES, DELIVERY_STYLES } from '@/types/lead'
import { formatDate } from '@/lib/utils'
import { BuyerLeadDetail } from './BuyerLeadDetail'
import type { Lead } from '@/types/lead'
import type { BuyerLeadsResponse } from '@/types/buyer'

export function BuyerLeads() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const { data, isLoading } = useQuery<BuyerLeadsResponse>({
    queryKey: [...QUERY_KEYS.LEADS, 'buyer', { page, search }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' })
      if (search) params.set('search', search)
      const { data } = await api.get(`/buyer/leads?${params.toString()}`)
      return data
    },
  })

  const leads = data?.leads || []
  const pages = data?.pagination?.pages || 0

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search leads..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
      />

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          {search ? 'No matching leads' : 'No leads assigned yet'}
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => (
            <button
              key={lead._id}
              onClick={() => setSelectedLead(lead)}
              className="w-full text-left rounded-xl border bg-card p-4 hover:bg-muted/50 transition-colors space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{lead.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                </div>
                <Badge className={`${STATUS_STYLES[lead.status] || ''} shrink-0 ml-2`}>{lead.status}</Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{lead.state}</span>
                <span>·</span>
                <span>{lead.source}</span>
                {lead.campaign && <><span>·</span><span>{lead.campaign}</span></>}
              </div>
              <div className="flex items-center justify-between text-xs">
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
