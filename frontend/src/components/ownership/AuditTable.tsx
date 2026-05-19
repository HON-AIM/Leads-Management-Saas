import { cn, formatDate } from '@/lib/utils'
import type { AuditEvent } from '@/types/ownership'

const auditStyles: Record<string, string> = {
  ownership_assigned: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  ownership_transferred: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400',
  ownership_locked: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  ownership_unlocked: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  reassigned: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  manual_override: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400',
}

const auditLabels: Record<string, string> = {
  ownership_assigned: 'Assigned',
  ownership_transferred: 'Transferred',
  ownership_locked: 'Locked',
  ownership_unlocked: 'Unlocked',
  reassigned: 'Reassigned',
  manual_override: 'Manual Override',
}

interface AuditTableProps {
  audit: AuditEvent[]
  loading?: boolean
  showLeadId?: boolean
}

export function AuditTable({ audit, loading, showLeadId }: AuditTableProps) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (audit.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50 mb-2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <p className="text-sm text-muted-foreground">No audit events recorded</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="px-3 py-2.5 text-left font-medium">Event</th>
            <th className="px-3 py-2.5 text-left font-medium">From</th>
            <th className="px-3 py-2.5 text-left font-medium">To</th>
            <th className="px-3 py-2.5 text-left font-medium">Method</th>
            <th className="px-3 py-2.5 text-left font-medium">By</th>
            <th className="px-3 py-2.5 text-left font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {audit.map((event) => (
            <tr key={event._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-3 py-2.5">
                <span className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                  auditStyles[event.eventType]
                )}>
                  {auditLabels[event.eventType] || event.eventType}
                </span>
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">
                {event.previousOwnerName || '—'}
              </td>
              <td className="px-3 py-2.5 font-medium">
                {event.newOwnerName || '—'}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground capitalize">
                {event.routingMethod.replace(/_/g, ' ')}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">
                {event.performedBy}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                {formatDate(event.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
