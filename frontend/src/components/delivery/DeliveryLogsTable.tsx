import { Button } from '@/components/ui/button'
import { formatDate, formatNumber } from '@/lib/utils'
import { getStatusStyle, getTextColor, DELIVERY_STATUS_COLOR } from '@/lib/statusColors'
import type { DeliveryLog } from '@/types/delivery'
import { Eye, RefreshCw } from 'lucide-react'

interface DeliveryLogsTableProps {
  logs: DeliveryLog[]
  isLoading: boolean
  total: number
  limit: number
  skip: number
  onPageChange: (skip: number) => void
  onRetry: (log: DeliveryLog) => void
  onInspect: (log: DeliveryLog) => void
}

export function DeliveryLogsTable({ logs, isLoading, total, limit, skip, onPageChange, onRetry, onInspect }: DeliveryLogsTableProps) {
  const pages = Math.ceil(total / limit)
  const currentPage = Math.floor(skip / limit) + 1

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-white/[0.06] text-[10px] text-muted-foreground uppercase tracking-wider">
              <th className="text-left font-medium px-6 py-2.5">Lead</th>
              <th className="text-left font-medium px-6 py-2.5">Buyer</th>
              <th className="text-left font-medium px-6 py-2.5">Status</th>
              <th className="text-left font-medium px-6 py-2.5">Provider</th>
              <th className="text-left font-medium px-6 py-2.5">Attempt</th>
              <th className="text-left font-medium px-6 py-2.5">Response</th>
              <th className="text-left font-medium px-6 py-2.5">Duration</th>
              <th className="text-left font-medium px-6 py-2.5">Date</th>
              <th className="text-right font-medium px-6 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.06]">
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="px-6 py-3"><div className="h-4 w-16 skeleton bg-white/[0.05] rounded" /></td>
                    ))}
                  </tr>
                ))}
              </>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-[13px] text-muted-foreground">No delivery logs found</td>
              </tr>
            ) : (
              logs.map((log) => {
                const leadName = typeof log.leadId === 'object' ? log.leadId?.name || 'Unknown' : log.leadId
                const leadEmail = typeof log.leadId === 'object' ? log.leadId?.email : ''
                const buyerName = typeof log.buyerId === 'object' ? log.buyerId?.name : (log.buyerId || '-')
                const dur = log.duration != null ? `${formatNumber(log.duration)}ms` : '-'

                return (
                  <tr key={log._id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-medium text-white/80">{leadName}</p>
                      {leadEmail && <p className="text-[11px] text-muted-foreground">{leadEmail}</p>}
                    </td>
                    <td className="px-6 py-3 text-[12px] text-white/70">{buyerName}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${getStatusStyle(log.status, DELIVERY_STATUS_COLOR)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-[12px] text-white/70 capitalize">{log.provider}</td>
                    <td className="px-6 py-3 text-[12px] text-white/60">{log.attempt}</td>
                    <td className="px-6 py-3">
                      {log.responseCode ? (
                        <span className={`text-[12px] font-medium ${
                          log.responseCode >= 200 && log.responseCode < 300
                            ? getTextColor('delivered', DELIVERY_STATUS_COLOR)
                            : getTextColor('failed', DELIVERY_STATUS_COLOR)
                        }`}>
                          {log.responseCode}
                        </span>
                      ) : log.error ? (
                        <span className="text-[12px] text-red-400 truncate max-w-[120px] inline-block">{log.error}</span>
                      ) : <span className="text-[12px] text-white/55">-</span>}
                    </td>
                    <td className="px-6 py-3 text-[12px] text-white/55">{dur}</td>
                    <td className="px-6 py-3 text-[12px] text-white/55 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          onClick={() => onInspect(log)}
                          className="rounded-md p-1.5 text-muted-foreground hover:text-white hover:bg-white/[0.06] transition-colors"
                          title="Inspect"
                        >
                          <Eye size={13} />
                        </button>
                        {log.status === 'failed' && (
                          <button
                            onClick={() => onRetry(log)}
                            className="rounded-md p-1.5 text-muted-foreground hover:text-white hover:bg-white/[0.06] transition-colors"
                            title="Retry"
                          >
                            <RefreshCw size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-white/[0.06] px-6 py-3">
          <p className="text-[12px] text-muted-foreground">
            Showing {skip + 1}–{Math.min(skip + limit, total)} of {formatNumber(total)}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={skip <= 0} onClick={() => onPageChange(skip - limit)}>Previous</Button>
            {Array.from({ length: pages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - currentPage) <= 2 || p === 1 || p === pages)
              .map((p, idx, arr) => (
                <span key={p} className="inline-flex items-center">
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-[11px] text-muted-foreground">...</span>}
                  <Button variant={p === currentPage ? 'default' : 'outline'} size="sm" className="min-w-[32px] h-8" onClick={() => onPageChange((p - 1) * limit)}>{p}</Button>
                </span>
              ))}
            <Button variant="outline" size="sm" disabled={skip + limit >= total} onClick={() => onPageChange(skip + limit)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
