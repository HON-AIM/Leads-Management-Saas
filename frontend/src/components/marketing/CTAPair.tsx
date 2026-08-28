import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { ROUTES } from '@/lib/constants'

interface CTAPairProps {
  primaryLabel?: string
  primaryHref?: string
  primaryExternal?: boolean
  secondaryLabel?: string
  secondaryHref?: string
}

export function CTAPair({
  primaryLabel = 'Start Free Trial',
  primaryHref = ROUTES.LOGIN,
  primaryExternal = false,
  secondaryLabel = 'See Pricing',
  secondaryHref = '#pricing',
}: CTAPairProps) {
  const primary =
    primaryExternal || primaryHref.startsWith('http') ? (
      <a
        href={primaryHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800"
      >
        {primaryLabel}
        <ArrowRight size={14} />
      </a>
    ) : (
      <Link
        to={primaryHref}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800"
      >
        {primaryLabel}
        <ArrowRight size={14} />
      </Link>
    )

  return (
    <div className="flex flex-wrap items-center gap-3">
      {primary}
      <a
        href={secondaryHref}
        className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-2.5 text-[13px] font-medium text-slate-300 transition hover:border-white/[0.14] hover:text-white"
      >
        {secondaryLabel}
      </a>
    </div>
  )
}