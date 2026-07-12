import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'
import {
  ArrowRight,
  Check,
  ChevronDown,
  Menu,
  X,
  Zap,
  Shield,
  BarChart3,
  Globe,
  Users,
  Repeat,
  Send,
  Database,
  Settings,
  AlertTriangle,
  GitBranch,
  Activity,
  Building2,
  FileCode,
  Eye,
  TrendingUp,
  Layers,
  Workflow,
  ArrowRightLeft,
  Gauge,
  Lock,
  Star,
} from 'lucide-react'

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
  }, [])
  return active
}

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

const PAIN_POINTS = [
  { icon: AlertTriangle, title: 'Manual Routing', desc: 'Leads sit idle while your team manually assigns them to buyers.' },
  { icon: Users, title: 'Uneven Distribution', desc: 'Some buyers get flooded while others starve — no fairness logic.' },
  { icon: Copy, title: 'Duplicate Leads', desc: 'Same lead sent to multiple buyers, destroying trust and ROI.' },
  { icon: TrendingUp, title: 'No Caps', desc: 'Buyers get more leads than they can handle — quality drops fast.' },
  { icon: Eye, title: 'Poor Visibility', desc: 'No logs, no tracking, no idea where leads go or why.' },
  { icon: Settings, title: 'Complex Setup', desc: 'Existing tools require weeks of configuration to get running.' },
]

const SOLUTIONS = [
  { icon: Repeat, title: 'Round Robin', desc: 'Fair, automatic rotation across all eligible buyers.' },
  { icon: BarChart3, title: 'Weighted Distribution', desc: 'Give priority buyers more leads based on configurable weights.' },
  { icon: Shield, title: 'Lead Caps', desc: 'Set daily, weekly, or total caps per buyer automatically.' },
  { icon: Globe, title: 'Country & State Routing', desc: 'Route leads to geo-specific buyers instantly.' },
  { icon: GitBranch, title: 'Duplicate Detection', desc: 'Built-in deduplication across configurable time windows.' },
  { icon: Layers, title: 'Campaign Management', desc: 'Organize leads by campaign with per-campaign routing rules.' },
  { icon: Building2, title: 'Buyer Management', desc: 'Full buyer profiles with caps, priorities, and status controls.' },
  { icon: Send, title: 'Webhook Delivery', desc: 'POST leads to any endpoint with customizable JSON payloads.' },
  { icon: FileCode, title: 'Payload Templates', desc: 'Map lead fields to buyer-specific payload formats.' },
  { icon: Activity, title: 'Real-time Monitoring', desc: 'Live delivery logs, success rates, and error tracking.' },
]

const STEPS = [
  { num: '01', title: 'Receive Lead', desc: 'Lead arrives via webhook, API, or ping-post.', icon: Zap },
  { num: '02', title: 'Routing Engine', desc: 'Campaign rules evaluate buyer eligibility.', icon: Workflow },
  { num: '03', title: 'Buyer Selection', desc: 'Strategy picks the optimal buyer — round-robin, weighted, or priority.', icon: ArrowRightLeft },
  { num: '04', title: 'Webhook Delivery', desc: 'Lead payload is POSTed to the buyer\'s endpoint.', icon: Send },
  { num: '05', title: 'Buyer Receives Lead', desc: 'Buyer gets the lead in their preferred format.', icon: Check },
]

const FEATURES_GRID = [
  { icon: Layers, title: 'Campaigns', desc: 'Organize and manage lead distribution campaigns.' },
  { icon: Building2, title: 'Buyers', desc: 'Manage buyer profiles, caps, and priorities.' },
  { icon: Repeat, title: 'Round Robin', desc: 'Fair, automatic lead rotation.' },
  { icon: BarChart3, title: 'Weighted Routing', desc: 'Priority-based lead distribution.' },
  { icon: Shield, title: 'Lead Caps', desc: 'Control lead volume per buyer.' },
  { icon: GitBranch, title: 'Duplicate Detection', desc: 'Prevent duplicate lead delivery.' },
  { icon: Globe, title: 'Geo Routing', desc: 'Country and state-based routing.' },
  { icon: Send, title: 'Webhook Delivery', desc: 'POST leads to any endpoint.' },
  { icon: FileCode, title: 'Payload Templates', desc: 'Customizable JSON payloads.' },
  { icon: Activity, title: 'Delivery Logs', desc: 'Track every delivery attempt.' },
  { icon: Gauge, title: 'Dashboard', desc: 'Real-time performance overview.' },
  { icon: TrendingUp, title: 'Analytics', desc: 'Insights into lead flow and buyer performance.' },
]

const TESTIMONIALS = [
  { name: 'Sarah Mitchell', role: 'Operations Director, Apex Insurance', text: 'We cut our lead delivery time from 12 minutes to under 30 seconds. The round-robin routing alone saved us thousands.' },
  { name: 'James Rodriguez', role: 'CEO, SolarLead Co.', text: 'Finally a routing tool that actually works. Setup took 20 minutes and we were live the same day.' },
  { name: 'Emily Chen', role: 'VP Marketing, HomeConnect', text: 'The duplicate detection feature alone paid for itself in the first week. Our buyers love the clean data.' },
]

const FAQ_ITEMS = [
  { q: 'How long does setup take?', a: 'Most agencies are live within 15-30 minutes. Create a campaign, add your buyers with their webhook URLs, and start routing leads immediately.' },
  { q: 'Can I route leads by state or country?', a: 'Yes. You can configure geo-based routing rules at the campaign level to send leads to state-specific or country-specific buyers.' },
  { q: 'What happens if a buyer\'s webhook is down?', a: 'Failed deliveries are automatically retried based on your configured retry policy. You can see all delivery attempts in the delivery logs.' },
  { q: 'Is there a duplicate detection system?', a: 'Yes. Our deduplication engine checks incoming leads against a configurable time window to prevent duplicate delivery to the same or different buyers.' },
  { q: 'Can I set lead caps per buyer?', a: 'Absolutely. Set daily, weekly, or total caps per buyer. Once a cap is hit, the buyer is automatically excluded from routing until the cap resets.' },
  { q: 'Do you support ping-post?', a: 'Yes. Our ping-post system allows you to receive lead data, route it to eligible buyers, and handle post responses for bid-based distribution.' },
]

function Copy(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
    </svg>
  )
}

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/[0.08] last:border-0">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-5 text-left">
        <span className="text-[14px] font-medium text-white/90">{q}</span>
        <ChevronDown size={16} className={`shrink-0 text-muted-foreground/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="pb-5">
          <p className="text-[13px] text-muted-foreground/60 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  )
}

export function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const activeSection = useScrollspy(['features', 'how-it-works', 'pricing', 'faq'])

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white antialiased">
      {/* ── Nav ─────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-white/[0.08] bg-[#0a0f1e]/80 backdrop-blur-xl' : 'bg-transparent'}`}>
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-[9px] font-bold tracking-wider text-white">LF</div>
            <span className="text-[14px] font-semibold tracking-tight">LeadFlowX</span>
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className={`text-[12px] transition-colors ${activeSection === l.href.slice(1) ? 'text-white' : 'text-muted-foreground/50 hover:text-white/70'}`}>
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link to={ROUTES.LOGIN} className="text-[12px] text-muted-foreground/50 transition-colors hover:text-white/70">Log in</Link>
            <Link to={ROUTES.LOGIN} className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-[12px] font-medium text-white transition hover:bg-blue-700">Get Started</Link>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-muted-foreground/50">
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-white/[0.08] bg-[#0a0f1e]/95 backdrop-blur-xl md:hidden">
            <div className="flex flex-col gap-1 px-5 py-4">
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-[13px] text-muted-foreground/50 transition hover:bg-white/[0.03] hover:text-white">{l.label}</a>
              ))}
              <div className="my-2 h-px bg-white/[0.05]" />
              <Link to={ROUTES.LOGIN} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-[13px] text-muted-foreground/50 transition hover:bg-white/[0.03] hover:text-white">Log in</Link>
              <Link to={ROUTES.LOGIN} onClick={() => setMobileOpen(false)} className="mt-1 rounded-lg bg-blue-600 px-3 py-2 text-center text-[13px] font-medium text-white transition hover:bg-blue-700">Get Started</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative pt-28 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.12),transparent)]" />
        <div className="absolute top-32 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-blue-500/[0.04] blur-[120px]" />

        <div className="relative mx-auto max-w-6xl px-5">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="max-w-xl">
              <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                <span className="text-[11px] text-blue-400">AI-Powered Lead Distribution</span>
              </div>

              <h1 className="text-[36px] font-bold leading-[1.1] tracking-tight sm:text-[44px]">
                Lead Distribution Built for <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">Agencies That Need Reliability</span>
              </h1>

              <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground/60">
                Route leads to the right buyers in real-time with round-robin, weighted, and priority-based distribution. Set caps, detect duplicates, and track every delivery — all from one dashboard.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to={ROUTES.LOGIN} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800">
                  Request Demo
                  <ArrowRight size={14} />
                </Link>
                <a href="#how-it-works" className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-[13px] font-medium text-muted-foreground/70 transition hover:border-white/[0.12] hover:text-white/80">
                  Watch Demo
                </a>
              </div>

              <div className="mt-6 flex items-center gap-4 text-[11px] text-muted-foreground/40">
                <span className="flex items-center gap-1"><Check size={12} className="text-blue-500" /> No credit card</span>
                <span className="flex items-center gap-1"><Check size={12} className="text-blue-500" /> Free plan</span>
                <span className="flex items-center gap-1"><Check size={12} className="text-blue-500" /> 5-min setup</span>
              </div>
            </div>

            {/* Dashboard mockup */}
            <div className="relative hidden lg:block">
              <div className="rounded-2xl border border-white/[0.08] bg-[#0e1428] p-1 shadow-2xl shadow-blue-500/5">
                <div className="rounded-xl bg-[#0a0f1e] p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
                    <span className="ml-2 text-[10px] text-muted-foreground/30">LeadFlowX — Dashboard</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[{ l: 'Total Leads', v: '12,847', c: 'text-white' }, { l: 'Active Buyers', v: '24', c: 'text-emerald-400' }, { l: 'Delivery Rate', v: '98.6%', c: 'text-blue-400' }].map((s) => (
                      <div key={s.l} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                        <div className="text-[10px] text-muted-foreground/40">{s.l}</div>
                        <div className={`mt-1 text-[18px] font-semibold ${s.c}`}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="h-28 rounded-lg border border-white/[0.08] bg-white/[0.01] p-3">
                    <div className="text-[10px] text-muted-foreground/30 mb-2">Lead Activity</div>
                    <div className="flex items-end gap-1.5 h-16">
                      {[40, 65, 55, 80, 70, 90, 85, 95, 75, 88, 92, 78].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t bg-blue-500/30" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 rounded-xl border border-white/[0.08] bg-[#0e1428] px-3 py-2 shadow-lg">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-emerald-400" />
                  <span className="text-[11px] text-white/70">Lead routed in 0.3s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trusted By ─────────────────────────────── */}
      <section className="border-y border-white/[0.08] py-8">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-center text-[11px] uppercase tracking-wider text-muted-foreground/30 mb-5">Trusted by agencies across industries</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {['Insurance', 'Mortgage', 'Solar', 'Legal', 'Home Services'].map((n) => (
              <span key={n} className="text-[13px] font-medium text-muted-foreground/25">{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problems ───────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-lg text-center mb-12">
            <p className="text-[11px] uppercase tracking-wider text-blue-400/70 mb-2">The Problem</p>
            <h2 className="text-[28px] font-bold tracking-tight">Manual lead routing is broken</h2>
            <p className="mt-3 text-[14px] text-muted-foreground/50">Agencies lose revenue every day because their lead distribution can't keep up.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PAIN_POINTS.map((p) => (
              <div key={p.title} className="rounded-xl border border-white/[0.08] bg-[#0e1428]/60 p-5 transition hover:border-white/[0.08]">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                  <p.icon size={18} className="text-red-400/70" />
                </div>
                <h3 className="text-[14px] font-semibold text-white/90">{p.title}</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground/50">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solutions ──────────────────────────────── */}
      <section className="py-20 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(59,130,246,0.06),transparent)]">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-lg text-center mb-12">
            <p className="text-[11px] uppercase tracking-wider text-emerald-400/70 mb-2">The Solution</p>
            <h2 className="text-[28px] font-bold tracking-tight">Everything you need to distribute leads</h2>
            <p className="mt-3 text-[14px] text-muted-foreground/50">A complete routing engine with every feature agencies need.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SOLUTIONS.map((s) => (
              <div key={s.title} className="rounded-xl border border-white/[0.08] bg-[#0e1428]/60 p-5 transition hover:border-white/[0.08] hover:bg-[#0e1428]">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                  <s.icon size={18} className="text-blue-400/70" />
                </div>
                <h3 className="text-[14px] font-semibold text-white/90">{s.title}</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground/50">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────── */}
      <section id="how-it-works" className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-lg text-center mb-14">
            <p className="text-[11px] uppercase tracking-wider text-blue-400/70 mb-2">How It Works</p>
            <h2 className="text-[28px] font-bold tracking-tight">From lead to buyer in seconds</h2>
            <p className="mt-3 text-[14px] text-muted-foreground/50">Five steps. Fully automated. Zero manual work.</p>
          </div>
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 hidden w-px bg-gradient-to-b from-blue-500/20 via-blue-500/10 to-transparent lg:block" />
            <div className="space-y-6">
              {STEPS.map((s) => (
                <div key={s.num} className="relative flex items-start gap-6 lg:gap-10">
                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#0e1428]">
                    <s.icon size={20} className="text-blue-400" />
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-[#0e1428]/60 p-5 flex-1">
                    <div className="text-[10px] font-mono text-blue-400/50 mb-1">Step {s.num}</div>
                    <h3 className="text-[14px] font-semibold text-white/90">{s.title}</h3>
                    <p className="mt-1 text-[12px] text-muted-foreground/50">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Grid ──────────────────────────── */}
      <section id="features" className="py-20 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(59,130,246,0.05),transparent)]">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-lg text-center mb-12">
            <p className="text-[11px] uppercase tracking-wider text-blue-400/70 mb-2">Features</p>
            <h2 className="text-[28px] font-bold tracking-tight">Built for performance</h2>
            <p className="mt-3 text-[14px] text-muted-foreground/50">Every feature designed to help agencies route leads faster and smarter.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES_GRID.map((f) => (
              <div key={f.title} className="group rounded-xl border border-white/[0.08] bg-[#0e1428]/40 p-4 transition hover:border-white/[0.08] hover:bg-[#0e1428]/80">
                <f.icon size={18} className="mb-2.5 text-blue-400/60 transition group-hover:text-blue-400" />
                <h3 className="text-[13px] font-semibold text-white/85">{f.title}</h3>
                <p className="mt-1 text-[11px] text-muted-foreground/45">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dashboard Preview ──────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-lg text-center mb-12">
            <p className="text-[11px] uppercase tracking-wider text-emerald-400/70 mb-2">Dashboard</p>
            <h2 className="text-[28px] font-bold tracking-tight">See everything at a glance</h2>
            <p className="mt-3 text-[14px] text-muted-foreground/50">Real-time metrics, delivery logs, and buyer performance — all in one view.</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#0e1428] p-1 shadow-2xl shadow-blue-500/5">
            <div className="rounded-xl bg-[#0a0f1e] p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
              </div>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[{ l: 'Leads Today', v: '847', c: 'text-white' }, { l: 'Routed', v: '812', c: 'text-emerald-400' }, { l: 'Pending', v: '23', c: 'text-amber-400' }, { l: 'Failed', v: '12', c: 'text-red-400' }].map((s) => (
                  <div key={s.l} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                    <div className="text-[10px] text-muted-foreground/40">{s.l}</div>
                    <div className={`mt-1 text-[16px] font-semibold ${s.c}`}>{s.v}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 h-32 rounded-lg border border-white/[0.08] bg-white/[0.01] p-3">
                  <div className="text-[10px] text-muted-foreground/30 mb-2">Delivery Trend</div>
                  <div className="flex items-end gap-1 h-20">
                    {[35, 55, 45, 70, 60, 80, 75, 85, 65, 78, 82, 72, 88, 90, 84].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t bg-emerald-500/25" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="h-32 rounded-lg border border-white/[0.08] bg-white/[0.01] p-3">
                  <div className="text-[10px] text-muted-foreground/30 mb-2">Top Buyers</div>
                  <div className="space-y-2 mt-2">
                    {[{ n: 'Genesis Insurance', p: 85 }, { n: 'Prime Leads', p: 72 }, { n: 'Apex Coverage', p: 60 }].map((b) => (
                      <div key={b.n}>
                        <div className="flex justify-between text-[9px] text-muted-foreground/40 mb-0.5">
                          <span>{b.n}</span><span>{b.p}%</span>
                        </div>
                        <div className="h-1 rounded-full bg-white/[0.04]">
                          <div className="h-full rounded-full bg-blue-500/40" style={{ width: `${b.p}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────── */}
      <section className="py-20 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(59,130,246,0.04),transparent)]">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-lg text-center mb-12">
            <p className="text-[11px] uppercase tracking-wider text-amber-400/70 mb-2">Testimonials</p>
            <h2 className="text-[28px] font-bold tracking-tight">Trusted by agencies everywhere</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-xl border border-white/[0.08] bg-[#0e1428]/60 p-5">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} size={12} className="fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-[13px] text-muted-foreground/60 leading-relaxed">"{t.text}"</p>
                <div className="mt-4 border-t border-white/[0.08] pt-3">
                  <div className="text-[12px] font-medium text-white/80">{t.name}</div>
                  <div className="text-[11px] text-muted-foreground/40">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────── */}
      <section id="faq" className="py-20">
        <div className="mx-auto max-w-2xl px-5">
          <div className="text-center mb-10">
            <p className="text-[11px] uppercase tracking-wider text-blue-400/70 mb-2">FAQ</p>
            <h2 className="text-[28px] font-bold tracking-tight">Frequently asked questions</h2>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[#0e1428]/40 px-5">
            {FAQ_ITEMS.map((item) => <FAQ key={item.q} {...item} />)}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────── */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center mb-12">
            <p className="text-[11px] uppercase tracking-wider text-emerald-400/70 mb-2">Pricing</p>
            <h2 className="text-[28px] font-bold tracking-tight">Simple, transparent pricing</h2>
            <p className="mt-3 text-[14px] text-muted-foreground/50">Start free. Scale when you're ready.</p>
          </div>
          <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/[0.08] bg-[#0e1428]/60 p-6">
              <h3 className="text-[16px] font-semibold text-white/90">Starter</h3>
              <p className="mt-1 text-[12px] text-muted-foreground/50">For small agencies getting started.</p>
              <div className="mt-4 text-[28px] font-bold text-white">$0<span className="text-[13px] font-normal text-muted-foreground/40">/mo</span></div>
              <ul className="mt-4 space-y-2">
                {['1 Campaign', '5 Buyers', '1,000 leads/mo', 'Basic routing', 'Email support'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[12px] text-muted-foreground/60"><Check size={12} className="text-emerald-400 shrink-0" />{f}</li>
                ))}
              </ul>
              <Link to={ROUTES.LOGIN} className="mt-6 block w-full rounded-lg border border-white/[0.08] py-2 text-center text-[13px] font-medium text-white/80 transition hover:bg-white/[0.04]">Get Started</Link>
            </div>
            <div className="relative rounded-xl border border-blue-500/20 bg-[#0e1428]/80 p-6 shadow-lg shadow-blue-500/5">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-semibold text-white">Most Popular</div>
              <h3 className="text-[16px] font-semibold text-white/90">Pro</h3>
              <p className="mt-1 text-[12px] text-muted-foreground/50">For agencies that need full power.</p>
              <div className="mt-4 text-[28px] font-bold text-white">$49<span className="text-[13px] font-normal text-muted-foreground/40">/mo</span></div>
              <ul className="mt-4 space-y-2">
                {['Unlimited Campaigns', 'Unlimited Buyers', '50,000 leads/mo', 'All routing strategies', 'Priority support', 'API access'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[12px] text-muted-foreground/60"><Check size={12} className="text-emerald-400 shrink-0" />{f}</li>
                ))}
              </ul>
              <Link to={ROUTES.LOGIN} className="mt-6 block w-full rounded-lg bg-blue-600 py-2 text-center text-[13px] font-semibold text-white transition hover:bg-blue-700">Get Started</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-2xl px-5 text-center">
          <h2 className="text-[28px] font-bold tracking-tight">Ready to Simplify Lead Distribution?</h2>
          <p className="mt-3 text-[14px] text-muted-foreground/50">Join agencies that route leads in seconds, not minutes.</p>
          <Link to={ROUTES.LOGIN} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-[14px] font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800">
            Book a Demo
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="border-t border-white/[0.08] py-10">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-[8px] font-bold text-white">LF</div>
                <span className="text-[13px] font-semibold">LeadFlowX</span>
              </div>
              <p className="text-[12px] text-muted-foreground/40 leading-relaxed">AI-powered lead distribution for agencies that demand reliability.</p>
            </div>
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/30 mb-3">Product</h4>
              <ul className="space-y-2">
                {['Features', 'Pricing', 'How It Works', 'API Docs'].map((l) => (
                  <li key={l}><a href="#" className="text-[12px] text-muted-foreground/40 transition hover:text-white/60">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/30 mb-3">Company</h4>
              <ul className="space-y-2">
                {['About', 'Blog', 'Careers', 'Contact'].map((l) => (
                  <li key={l}><a href="#" className="text-[12px] text-muted-foreground/40 transition hover:text-white/60">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/30 mb-3">Support</h4>
              <ul className="space-y-2">
                {['Help Center', 'Privacy Policy', 'Terms of Service', 'Status'].map((l) => (
                  <li key={l}><a href="#" className="text-[12px] text-muted-foreground/40 transition hover:text-white/60">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-white/[0.08] pt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-[11px] text-muted-foreground/25">&copy; {new Date().getFullYear()} LeadFlowX. All rights reserved.</p>
            <div className="flex items-center gap-4">
              {['Twitter', 'LinkedIn', 'GitHub'].map((s) => (
                <a key={s} href="#" className="text-[11px] text-muted-foreground/25 transition hover:text-white/40">{s}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
