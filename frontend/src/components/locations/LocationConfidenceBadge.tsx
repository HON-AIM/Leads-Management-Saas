import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const confidenceColor = (score: number) => {
  if (score >= 0.8) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  if (score >= 0.5) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
}

export function LocationConfidenceBadge({ score }: { score: number }) {
  const label = score >= 0.8 ? 'High' : score >= 0.5 ? 'Medium' : 'Low'
  return (
    <Badge className={cn('font-medium', confidenceColor(score))}>
      {label} ({(score * 100).toFixed(0)}%)
    </Badge>
  )
}
