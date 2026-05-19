import { cn, formatDate } from '@/lib/utils'
import type { RoutingEvent, RoutingEventType } from '@/types/ownership'
import { EVENT_TYPE_LABELS, EVENT_TYPE_STYLES } from '@/types/ownership'

const eventIcons: Record<RoutingEventType, React.ReactNode> = {
  assigned: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
  ),
  reassigned: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
  ),
  routing_failed: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
  ),
  delivery_failed: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  ),
  delivery_retried: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
  ),
  delivered: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  ),
  ownership_transferred: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 7l-1-4 4 1-3 3z"/><path d="M7 17l1 4-4-1 3-3z"/><circle cx="12" cy="12" r="2"/></svg>
  ),
  ownership_locked: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  ),
  ownership_unlocked: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
  ),
  crm_synced: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
  ),
  crm_sync_failed: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
  ),
  unassigned: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="18" y1="9" x2="18" y2="15"/><line x1="15" y1="12" x2="21" y2="12"/></svg>
  ),
}

export function RoutingTimeline({ events }: { events: RoutingEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50 mb-3">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <p className="text-sm text-muted-foreground">No routing events recorded</p>
      </div>
    )
  }

  return (
    <div className="relative space-y-0">
      {events.map((event, idx) => {
        const isLast = idx === events.length - 1
        return (
          <div key={event._id} className="relative flex gap-4 pb-6">
            {!isLast && (
              <div className="absolute left-[15px] top-7 bottom-0 w-px bg-border" />
            )}
            <div className={cn(
              'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
              event.eventType.includes('failed')
                ? 'border-red-400 dark:border-red-500 bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                : event.eventType === 'reassigned' || event.eventType === 'ownership_transferred'
                  ? 'border-amber-400 dark:border-amber-500 bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                  : event.eventType === 'ownership_locked'
                    ? 'border-blue-400 dark:border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                    : 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
            )}>
              {eventIcons[event.eventType] || eventIcons.assigned}
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                  EVENT_TYPE_STYLES[event.eventType]
                )}>
                  {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatDate(event.createdAt)}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                {event.toBuyerName && (
                  <p>Buyer: <span className="font-medium text-foreground">{event.toBuyerName}</span></p>
                )}
                {event.fromOwnerName && (
                  <p>From: <span className="font-medium text-foreground">{event.fromOwnerName}</span></p>
                )}
                {event.routingReason && (
                  <p>Reason: {event.routingReason}</p>
                )}
                {event.systemNotes && (
                  <p className="text-muted-foreground/80 dark:text-muted-foreground/90 italic">{event.systemNotes}</p>
                )}
                <div className="flex items-center gap-3 pt-0.5">
                  <span className="text-muted-foreground/70 dark:text-muted-foreground/80 capitalize">{event.routingMethod.replace(/_/g, ' ')}</span>
                  {event.performedBy !== 'system' && (
                    <span className="text-muted-foreground/70 dark:text-muted-foreground/80">by {event.performedBy}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
