import { QUICK_ACTIONS } from '@/types/ai'
import type { QuickAction } from '@/types/ai'

interface AiQuickActionsProps {
  onAction: (prompt: string) => void
  visible: boolean
}

export function AiQuickActions({ onAction, visible }: AiQuickActionsProps) {
  if (!visible) return null

  return (
    <div className="space-y-1.5 px-4 pb-2">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Quick Actions</p>
      <div className="grid grid-cols-2 gap-1.5">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action.prompt)}
            className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 text-left text-xs hover:bg-muted/50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-primary">
              <path d={action.icon} />
            </svg>
            <span className="font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
