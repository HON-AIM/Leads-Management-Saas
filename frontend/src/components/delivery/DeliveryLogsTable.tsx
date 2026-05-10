import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatNumber } from '@/lib/utils'
import { STATUS_STYLES } from '@/types/delivery'
import type { DeliveryLog } from '@/types/delivery'

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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left font-medium px-4 py-3">Lead</th>
              <th className="text-left font-medium px-4 py-3">Buyer</th>
              <th className="text-left font-medium px-4 py-3">Status</th>
              <th className="text-left font-medium px-4 py-3">Provider</th>
              <th className="text-left font-medium px-4 py-3">Attempt</th>
              <th className="text-left font-medium px-4 py-3">Response</th>
              <th className="text-left font-medium px-4 py-3">Duration</th>
              <th className="text-left font-medium px-4 py-3">Date</th>
              <th className="text-right font-medium px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-20 text-center text-sm text-muted-foreground">Loading delivery logs...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-20 text-center text-sm text-muted-foreground">No delivery logs found</td>
              </tr>
            ) : (
              logs.map((log) => {
                const leadName = typeof log.leadId === 'object' ? log.leadId?.name || 'Unknown' : log.leadId
                const leadEmail = typeof log.leadId === 'object' ? log.leadId?.email : ''
                const buyerName = typeof log.buyerId === 'object' ? log.buyerId?.name : (log.buyerId || '-')
                const dur = log.duration != null ? `${formatNumber(log.duration)}ms` : '-'

                return (
                  <tr key={log._id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{leadName}</p>
                      {leadEmail && <p className="text-xs text-muted-foreground">{leadEmail}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs">{buyerName}</td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_STYLES[log.status] || ''}>{log.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs capitalize">{log.provider}</td>
                    <td className="px-4 py-3 text-xs">{log.attempt}</td>
                    <td className="px-4 py-3">
                      {log.responseCode ? (
                        <span className={`text-xs font-medium ${
                          log.responseCode >= 200 && log.responseCode < 300
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {log.responseCode}
                        </span>
                      ) : log.error ? (
                        <span className="text-xs text-red-600 dark:text-red-400 truncate max-w-[120px] inline-block">{log.error}</span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{dur}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onInspect(log)} title="Inspect">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </Button>
                        {log.status === 'failed' && (
                          <Button variant="ghost" size="sm" onClick={() => onRetry(log)} title="Retry">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                          </Button>
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
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Showing {skip + 1}–{Math.min(skip + limit, total)} of {formatNumber(total)}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={skip <= 0} onClick={() => onPageChange(skip - limit)}>Previous</Button>
            {Array.from({ length: pages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - currentPage) <= 2 || p === 1 || p === pages)
              .map((p, idx, arr) => (
                <span key={p} className="inline-flex items-center">
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-xs text-muted-foreground">...</span>}
                  <Button variant={p === currentPage ? 'default' : 'outline'} size="sm" className="min-w-[32px]" onClick={() => onPageChange((p - 1) * limit)}>{p}</Button>
                </span>
              ))}
            <Button variant="outline" size="sm" disabled={skip + limit >= total} onClick={() => onPageChange(skip + limit)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
