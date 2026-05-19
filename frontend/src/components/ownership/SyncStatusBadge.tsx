import { cn } from '@/lib/utils'

interface SyncStatusBadgeProps {
  status: boolean | null | undefined
  retryCount?: number
  maxRetries?: number
  platform?: string
  className?: string
}

const syncStyles: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  retrying: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
}

export function SyncStatusBadge({ status, retryCount = 0, maxRetries = 3, platform, className }: SyncStatusBadgeProps) {
  const isRetrying = retryCount > 0 && retryCount < maxRetries

  const state = status === true ? 'completed'
    : status === false && isRetrying ? 'retrying'
      : status === false ? 'failed'
        : 'pending'

  const label = state === 'completed' ? 'Synced'
    : state === 'retrying' ? `Retry ${retryCount}/${maxRetries}`
      : state === 'failed' ? 'Failed'
        : 'Pending'

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
      syncStyles[state],
      className
    )}>
      {state === 'retrying' && (
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
      )}
      {state === 'completed' && (
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      )}
      {state === 'failed' && (
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      )}
      {platform && `${platform}: `}{label}
    </span>
  )
}
