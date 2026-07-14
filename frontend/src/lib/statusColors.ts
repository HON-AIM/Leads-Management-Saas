export const SEMANTIC_COLORS = {
  positive: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-300',
    ring: 'ring-1 ring-inset ring-emerald-400/40',
    dot: 'bg-emerald-400',
  },
  caution: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-300',
    ring: 'ring-1 ring-inset ring-amber-400/40',
    dot: 'bg-amber-400',
  },
  negative: {
    bg: 'bg-red-500/20',
    text: 'text-red-300',
    ring: 'ring-1 ring-inset ring-red-400/40',
    dot: 'bg-red-400',
  },
  info: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-300',
    ring: 'ring-1 ring-inset ring-blue-400/40',
    dot: 'bg-blue-400',
  },
  neutral: {
    bg: 'bg-slate-500/20',
    text: 'text-slate-300',
    ring: 'ring-1 ring-inset ring-slate-400/40',
    dot: 'bg-slate-400',
  },
} as const

export type SemanticKey = keyof typeof SEMANTIC_COLORS

export const LEAD_STATUS_COLOR: Record<string, SemanticKey> = {
  new: 'neutral',
  assigned: 'info',
  delivered: 'positive',
  failed: 'negative',
  duplicate: 'neutral',
  unassigned: 'caution',
}

export const DELIVERY_STATUS_COLOR: Record<string, SemanticKey> = {
  delivered: 'positive',
  success: 'positive',
  failed: 'negative',
  pending: 'neutral',
  returned: 'caution',
  retrying: 'caution',
}

export const BUYER_STATUS_COLOR: Record<string, SemanticKey> = {
  active: 'positive',
  paused: 'caution',
  inactive: 'neutral',
  full: 'caution',
}

export const CAMPAIGN_STATUS_COLOR: Record<string, SemanticKey> = {
  active: 'positive',
  inactive: 'neutral',
}

export const SUPPLIER_STATUS_COLOR: Record<string, SemanticKey> = {
  active: 'positive',
  paused: 'caution',
  inactive: 'neutral',
}

export function getStatusStyle(key: SemanticKey): string {
  const c = SEMANTIC_COLORS[key]
  return `${c.bg} ${c.text} ${c.ring}`
}

export function getTextColor(key: SemanticKey): string {
  return SEMANTIC_COLORS[key].text
}

export function getStatusDotColor(key: SemanticKey): string {
  return SEMANTIC_COLORS[key].dot
}
