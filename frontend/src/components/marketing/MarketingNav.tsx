import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'
import { Menu, X } from 'lucide-react'

function useScrollspy(ids: string[]) {
  const [active, setActive] = useState('')
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id)
        }
      },
      { rootMargin: '-20% 0px -60% 0px' }
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [ids])
  return active
}

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

export function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const activeSection = useScrollspy(['features', 'how-it-works', 'pricing', 'faq'])

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-white/[0.08] bg-surface-dark/80 backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-[9px] font-bold tracking-wider text-white">LF</div>
          <span className="text-[14px] font-semibold tracking-tight">LeadFlowX</span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`text-[12px] transition-colors ${
                activeSection === l.href.slice(1) ? 'text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link to={ROUTES.LOGIN} className="text-[12px] text-slate-300 transition-colors hover:text-white">
            Log in
          </Link>
          <Link
            to={ROUTES.LOGIN}
            className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-[12px] font-medium text-white transition hover:bg-blue-700"
          >
            Get Started
          </Link>
        </div>

        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-slate-300" aria-label="Toggle menu">
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/[0.08] bg-surface-dark/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1 px-5 py-4">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-[13px] text-slate-300 transition hover:bg-white/[0.03] hover:text-white"
              >
                {l.label}
              </a>
            ))}
            <div className="my-2 h-px bg-white/[0.05]" />
            <Link
              to={ROUTES.LOGIN}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2 text-[13px] text-slate-300 transition hover:bg-white/[0.03] hover:text-white"
            >
              Log in
            </Link>
            <Link
              to={ROUTES.LOGIN}
              onClick={() => setMobileOpen(false)}
              className="mt-1 rounded-lg bg-blue-600 px-3 py-2 text-center text-[13px] font-medium text-white transition hover:bg-blue-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}