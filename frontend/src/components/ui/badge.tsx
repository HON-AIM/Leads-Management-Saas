import { cn } from '@/lib/utils'
import { SEMANTIC_COLORS, type SemanticKey } from '@/lib/statusColors'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'
}

const variantStyles: Record<string, string> = {
  default: `${SEMANTIC_COLORS.info.bg} ${SEMANTIC_COLORS.info.text} ${SEMANTIC_COLORS.info.ring}`,
  success: `${SEMANTIC_COLORS.positive.bg} ${SEMANTIC_COLORS.positive.text} ${SEMANTIC_COLORS.positive.ring}`,
  warning: `${SEMANTIC_COLORS.caution.bg} ${SEMANTIC_COLORS.caution.text} ${SEMANTIC_COLORS.caution.ring}`,
  danger: `${SEMANTIC_COLORS.negative.bg} ${SEMANTIC_COLORS.negative.text} ${SEMANTIC_COLORS.negative.ring}`,
  info: `${SEMANTIC_COLORS.neutral.bg} ${SEMANTIC_COLORS.neutral.text} ${SEMANTIC_COLORS.neutral.ring}`,
  muted: 'bg-white/[0.06] text-muted-foreground',
}

export function Badge({ children, className = '', variant = 'default' }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none',
      variantStyles[variant],
      className
    )}>
      {children}
    </span>
  )
}
