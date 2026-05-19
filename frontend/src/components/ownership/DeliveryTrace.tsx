import { cn, formatDate } from '@/lib/utils'
import type { DeliveryStage } from '@/types/ownership'

const statusIcons: Record<string, React.ReactNode> = {
  completed: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 dark:text-emerald-400"><polyline points="20 6 9 17 4 12"/></svg>
  ),
  failed: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 dark:text-red-400"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
  ),
  skipped: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  ),
  pending: (
    <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/40" />
  ),
}

const stageLabels: Record<string, string> = {
  received: 'Lead Received',
  routing: 'Routing Decision',
  assignment: 'Assignment',
  delivery: 'Webhook Delivery',
  crm_sync: 'CRM Sync',
  confirmation: 'Confirmation',
}

export function DeliveryTrace({ stages }: { stages: DeliveryStage[] }) {
  if (stages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50 mb-3">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <p className="text-sm text-muted-foreground">No delivery trace available</p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {stages.map((stage, idx) => {
        const isLast = idx === stages.length - 1
        return (
          <div key={stage.stage} className="relative flex gap-3 pb-6">
            {!isLast && (
              <div className={cn(
                'absolute left-[11px] top-6 bottom-0 w-0.5',
                stage.status === 'completed' ? 'bg-emerald-500/30' : 'bg-border'
              )} />
            )}
            <div className={cn(
              'relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
              stage.status === 'completed' ? 'bg-emerald-500/10 dark:bg-emerald-400/10' : stage.status === 'failed' ? 'bg-red-500/10 dark:bg-red-400/10' : 'bg-muted'
            )}>
              {statusIcons[stage.status] || statusIcons.pending}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{stageLabels[stage.stage] || stage.stage}</span>
                {stage.timestamp && (
                  <span className="text-[10px] text-muted-foreground">{formatDate(stage.timestamp)}</span>
                )}
              </div>
              {stage.duration !== null && stage.duration !== undefined && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Duration: {stage.duration}ms
                </p>
              )}
              {stage.error && (
                <p className="text-[10px] text-red-500 dark:text-red-400 mt-0.5">{stage.error}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
