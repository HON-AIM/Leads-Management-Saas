import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { getStatusStyle, DELIVERY_STATUS_COLOR } from '@/lib/statusColors'
import { Button } from '@/components/ui/button'
import { ScrollText, ChevronLeft, ChevronRight } from 'lucide-react'

interface RoutingLogEntry {
  _id: string
  leadId: { _id: string; name: string; email: string } | null
  selectedBuyerId: { _id: string; name: string } | null
  routingMode: string
  reason?: string
  durationMs?: number
  createdAt: string
}

interface AssignmentLogEntry {
  _id: string
  leadId: { _id: string; name: string; email: string; state?: string } | null
  buyerId: { _id: string; name: string; email: string } | null
  routingMode?: string
  status: string
  deliveredAt?: string
  createdAt: string
}

export function LeadLogsTable() {
  const [subTab, setSubTab] = useState<'routing' | 'delivery'>('routing')
  const [page, setPage] = useState(1)
  const limit = 30

  const { data: routingData, isLoading: routingLoading } = useQuery<{ success: boolean; data: RoutingLogEntry[]; total: number; page: number; pages: number }>({
    queryKey: ['lead-routing-logs', page],
    queryFn: async () => {
      const { data } = await api.get('/delivery-logs/routing-logs', { params: { page: String(page), limit: String(limit) } })
      return data
    },
    enabled: subTab === 'routing',
  })

  const { data: deliveryData, isLoading: deliveryLoading } = useQuery<{ success: boolean; data: AssignmentLogEntry[]; total: number; page: number; pages: number }>({
    queryKey: ['lead-delivery-logs', page],
    queryFn: async () => {
      const { data } = await api.get('/delivery-logs', { params: { page: String(page), limit: String(limit) } })
      return data
    },
    enabled: subTab === 'delivery',
  })

  const logs = subTab === 'routing' ? (routingData?.data || []) : (deliveryData?.data || [])
  const isLoading = subTab === 'routing' ? routingLoading : deliveryLoading
  const pagination = subTab === 'routing' ? routingData : deliveryData

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-lg border border-white/[0.08] bg-[#0e1428] p-1 w-fit">
        <button
          onClick={() => { setSubTab('routing'); setPage(1) }}
          className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
            subTab === 'routing' ? 'bg-blue-500/15 text-blue-400' : 'text-muted-foreground hover:text-white/70'
          }`}
        >
          Routing Logs
        </button>
        <button
          onClick={() => { setSubTab('delivery'); setPage(1) }}
          className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
            subTab === 'delivery' ? 'bg-blue-500/15 text-blue-400' : 'text-muted-foreground hover:text-white/70'
          }`}
        >
          Delivery Logs
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10px] text-muted-foreground uppercase tracking-wider">
                {subTab === 'routing' ? (
                  <>
                    <th className="text-left font-medium px-6 py-2.5">Lead</th>
                    <th className="text-left font-medium px-6 py-2.5">Selected Buyer</th>
                    <th className="text-left font-medium px-6 py-2.5">Routing Mode</th>
                    <th className="text-left font-medium px-6 py-2.5">Duration</th>
                    <th className="text-left font-medium px-6 py-2.5">Reason</th>
                    <th className="text-left font-medium px-6 py-2.5">Time</th>
                  </>
                ) : (
                  <>
                    <th className="text-left font-medium px-6 py-2.5">Lead</th>
                    <th className="text-left font-medium px-6 py-2.5">Buyer</th>
                    <th className="text-left font-medium px-6 py-2.5">Status</th>
                    <th className="text-left font-medium px-6 py-2.5">Routing</th>
                    <th className="text-left font-medium px-6 py-2.5">Delivered</th>
                    <th className="text-left font-medium px-6 py-2.5">Created</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.06]">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-6 py-3"><div className="h-4 w-20 skeleton bg-white/[0.05] rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ScrollText size={24} className="text-white/20" />
                      <p className="text-[13px] text-muted-foreground">No logs yet</p>
                    </div>
                  </td>
                </tr>
              ) : subTab === 'routing' ? (
                (logs as RoutingLogEntry[]).map((log) => (
                  <tr key={log._id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-medium text-white/90">{log.leadId?.name || '—'}</p>
                      <p className="text-[11px] text-muted-foreground">{log.leadId?.email || '—'}</p>
                    </td>
                    <td className="px-6 py-3 text-[12px] text-white/70">
                      {log.selectedBuyerId?.name || <span className="text-muted-foreground italic">none</span>}
                    </td>
                    <td className="px-6 py-3 text-[12px] text-white/70 capitalize">
                      {log.routingMode?.replace(/_/g, ' ') || '—'}
                    </td>
                    <td className="px-6 py-3 text-[12px] text-white/55">
                      {log.durationMs != null ? `${log.durationMs}ms` : '—'}
                    </td>
                    <td className="px-6 py-3 text-[12px] text-muted-foreground max-w-[200px] truncate">
                      {log.reason || '—'}
                    </td>
                    <td className="px-6 py-3 text-[12px] text-white/55">
                      {formatDate(log.createdAt)}
                    </td>
                  </tr>
                ))
              ) : (
                (logs as AssignmentLogEntry[]).map((log) => (
                  <tr key={log._id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-medium text-white/90">{log.leadId?.name || '—'}</p>
                      <p className="text-[11px] text-muted-foreground">{log.leadId?.email || '—'}</p>
                    </td>
                    <td className="px-6 py-3 text-[12px] text-white/70">
                      {log.buyerId?.name || '—'}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${getStatusStyle(log.status, DELIVERY_STATUS_COLOR)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-[12px] text-white/70 capitalize">
                      {log.routingMode?.replace(/_/g, ' ') || '—'}
                    </td>
                    <td className="px-6 py-3 text-[12px] text-white/55">
                      {log.deliveredAt ? formatDate(log.deliveredAt) : '—'}
                    </td>
                    <td className="px-6 py-3 text-[12px] text-white/55">
                      {formatDate(log.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-white/[0.06] px-6 py-3">
            <p className="text-[12px] text-muted-foreground">
              Page {pagination.page} of {pagination.pages} ({pagination.total.toLocaleString()} entries)
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
    </div>
  )
}
