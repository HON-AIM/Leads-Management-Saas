import { cn } from '@/lib/utils'

interface AssignmentReasonBadgeProps {
  reason: string
  className?: string
}

const reasonStyles: Record<string, string> = {
  normal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  reassignment: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  'manual-override': 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400',
  fallback: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  retry: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
}

const reasonLabels: Record<string, string> = {
  normal: 'Normal',
  reassignment: 'Reassignment',
  'manual-override': 'Manual Override',
  fallback: 'Fallback',
  retry: 'Retry',
  error: 'Error',
}

export function AssignmentReasonBadge({ reason, className }: AssignmentReasonBadgeProps) {
  const normalized = reason.toLowerCase().replace(/\s+/g, '-')
  const style = reasonStyles[normalized]
    || (normalized.includes('reassign') ? reasonStyles.reassignment
      : normalized.includes('fallback') ? reasonStyles.fallback
        : normalized.includes('override') || normalized.includes('manual') ? reasonStyles['manual-override']
          : normalized.includes('error') || normalized.includes('fail') ? reasonStyles.error
            : normalized.includes('retry') ? reasonStyles.retry
              : reasonStyles.normal)

  const label = reasonLabels[normalized]
    || (normalized.includes('reassign') ? 'Reassignment'
      : normalized.includes('fallback') ? 'Fallback'
        : normalized.includes('override') || normalized.includes('manual') ? 'Manual Override'
          : normalized.includes('error') || normalized.includes('fail') ? 'Error'
            : normalized.includes('retry') ? 'Retry'
              : reason)

  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
      style,
      className
    )}>
      {label}
    </span>
  )
}
