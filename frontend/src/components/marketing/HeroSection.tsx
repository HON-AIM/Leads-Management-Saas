import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Star,
  ShieldCheck,
  Gauge,
  Timer,
  Zap,
  Brain,
  ChevronsRight,
} from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { SEMANTIC_COLORS } from '@/lib/statusColors'

const METRICS = [
  { label: 'Total Leads', value: '12,847', valueClass: 'text-white' },
  { label: 'Revenue', value: '$96,340', valueClass: SEMANTIC_COLORS.positive.text },
  { label: 'Delivery Rate', value: '99.2%', valueClass: SEMANTIC_COLORS.info.text },
  { label: 'Ai Avg. Score', value: '87 / 100', valueClass: SEMANTIC_COLORS.positive.text },
]

const TRUST_BADGES = [
  { icon: ShieldCheck, label: 'SOC 2 ready' },
  { icon: Gauge, label: '99.9% uptime' },
  { icon: Timer, label: '5-minute setup' },
]

const CHART_BARS = [42, 55, 48, 62, 58, 71, 66, 78, 72, 84, 80, 91, 88, 96]

const TOP_BUYERS = [
  { name: 'Presidio Insurance', pct: 34 },
  { name: 'Solar Peak Leads', pct: 27 },
  { name: 'Homeward Mortgage', pct: 22 },
  { name: 'Cornerstone Legal', pct: 17 },
]

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.14),transparent)]" />
      <div className="absolute top-32 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-blue-500/[0.04] blur-[120px]" />

      <div className="relative mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
              <span className="text-[11px] text-blue-300">AI-Powered Lead Distribution</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.12 }}
            className="text-[34px] font-bold leading-[1.08] tracking-tight sm:text-[44px] lg:text-[52px]"
          >
            AI-Powered Lead Distribution
            <br />
            That Maximizes Buyer{' '}
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              ROI
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.18 }}
            className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground/70"
          >
            LeadFlowX routes every lead to the right buyer in real time — round-robin, weighted, and
            priority distribution with buyer caps, AI scoring, duplicate protection, and live delivery
            tracking, all from one dashboard.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.24 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              to={ROUTES.LOGIN}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-[14px] font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800"
            >
              Start Free Trial
              <ArrowRight size={15} />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-6 py-3 text-[14px] font-medium text-slate-300 transition hover:border-white/[0.14] hover:text-white"
            >
              See How It Works
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, duration: 0.5, ease: 'easeOut' }}
            className="mt-8 flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-8"
          >
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground/60">
                4.9/5 average <span className="text-muted-foreground/35">· sample rating</span>
              </span>
            </div>
            <div className="hidden h-3 w-px bg-white/[0.08] sm:block" />
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              {TRUST_BADGES.map((b) => (
                <span key={b.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                  <b.icon size={12} className="text-blue-400/80" />
                  {b.label}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.7, ease: 'easeOut' }}
          className="relative mx-auto mt-16 max-w-4xl"
        >
          <div className="absolute -inset-x-8 -top-10 h-40 rounded-[40px] bg-blue-500/[0.07] blur-3xl" />
          <div className="relative rounded-2xl border border-white/[0.08] bg-surface-card p-1 shadow-2xl shadow-blue-500/10">
            <div className="rounded-xl bg-surface-dark p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
                <span className="ml-2 text-[10px] text-muted-foreground/40">LeadFlowX — Distribution Dashboard</span>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {METRICS.map((m) => (
                  <div key={m.label} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                    <div className="text-[10px] text-muted-foreground/50">{m.label}</div>
                    <div className={`mt-1 text-[18px] font-semibold ${m.valueClass}`}>{m.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.01] p-3 md:col-span-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground/40">Delivery Trend · last 14 days</span>
                    <span className="text-[10px] font-medium text-emerald-300">+18.4%</span>
                  </div>
                  <div className="flex h-20 items-end gap-1.5">
                    {CHART_BARS.map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-gradient-to-t from-emerald-600/40 to-emerald-400/80"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.01] p-3">
                  <span className="text-[10px] text-muted-foreground/40">Top Buyers</span>
                  <div className="mt-3 space-y-2.5">
                    {TOP_BUYERS.map((b) => (
                      <div key={b.name}>
                        <div className="mb-0.5 flex justify-between text-[9px] text-muted-foreground/50">
                          <span>{b.name}</span>
                          <span>{b.pct}%</span>
                        </div>
                        <div className="h-1 rounded-full bg-white/[0.05]">
                          <div
                            className="h-full rounded-full bg-blue-500/60"
                            style={{ width: `${b.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -left-3 -top-4 hidden rounded-xl border border-white/[0.08] bg-surface-card px-3 py-2 shadow-lg sm:block">
            <div className="flex items-center gap-2">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full ${SEMANTIC_COLORS.positive.bg}`}>
                <Check size={11} className={SEMANTIC_COLORS.positive.text} />
              </span>
              <div>
                <div className="text-[10px] font-medium text-white/80">Lead delivered</div>
                <div className="text-[9px] text-muted-foreground/50">Presidio Insurance · 212ms</div>
              </div>
            </div>
          </div>

          <div className="absolute -right-3 -bottom-4 hidden rounded-xl border border-white/[0.08] bg-surface-card px-3 py-2 shadow-lg sm:block">
            <div className="flex items-center gap-2">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full ${SEMANTIC_COLORS.info.bg}`}>
                <Brain size={11} className={SEMANTIC_COLORS.info.text} />
              </span>
              <div>
                <div className="text-[10px] font-medium text-white/80">AI Score 92</div>
                <div className="text-[9px] text-muted-foreground/50">High-intent · qualified fields</div>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-3 -right-3 flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-emerald-500/10 px-3 py-1.5 sm:right-1/2 sm:translate-x-1/2">
            <Zap size={11} className="text-emerald-400" />
            <span className="text-[10px] font-medium text-emerald-300">Routing live · round robin</span>
          </div>
          <div className="absolute left-1/2 top-1/2 hidden lg:flex -translate-y-[80px] items-center gap-1 text-blue-400/70">
            <ChevronsRight size={14} />
            <span className="text-[10px]">5 sources · 14 buyers · 1 pipeline</span>
            <ChevronsRight size={14} />
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default HeroSection