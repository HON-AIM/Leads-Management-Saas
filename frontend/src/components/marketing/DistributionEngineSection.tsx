import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import {
  Facebook,
  ClipboardList,
  Webhook,
  FileUp,
  Megaphone,
  Brain,
  ShieldCheck,
  SlidersHorizontal,
  GitBranch,
  Route,
  Sun,
  Home,
  Wrench,
  Scale,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { CTAPair } from './CTAPair'
import { SectionHeader } from './SectionHeader'
import { fadeInUp, stagger, drawLine, VIEWPORT } from './motion'

const connectorX = (delay: number): Variants => ({
  hidden: { scaleX: 0, opacity: 0 },
  visible: {
    scaleX: 1,
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut', delay },
  },
})

const connectorY = (delay: number): Variants => ({
  hidden: { scaleY: 0, opacity: 0 },
  visible: {
    scaleY: 1,
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut', delay },
  },
})

const spineDraw = (delay: number): Variants => ({
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.7, ease: 'easeInOut', delay },
  },
})

interface StageItem {
  icon: React.ElementType
  label: string
  desc: string
}

const SOURCES = [
  { icon: Facebook, label: 'Facebook Lead Ads' },
  { icon: ClipboardList, label: 'Landing Pages & Forms' },
  { icon: Megaphone, label: 'GoHighLevel' },
  { icon: Webhook, label: 'Webhook / API' },
  { icon: FileUp, label: 'CSV & Manual' },
]

const STAGES: StageItem[] = [
  { icon: ClipboardList, label: 'Normalize', desc: 'Standardize fields & state' },
  { icon: Route, label: 'Validate', desc: 'Required-data checks' },
  { icon: Brain, label: 'AI Score', desc: 'Claude scores 0–100' },
  { icon: GitBranch, label: 'Deduplicate', desc: 'Window-based duplicate guard' },
  { icon: SlidersHorizontal, label: 'Filter & Caps', desc: 'Geo, min-score, daily caps' },
  { icon: Webhook, label: 'Distribute', desc: 'Round robin · Weighted · Priority' },
]

const BUYERS = [
  { icon: ShieldCheck, label: 'Insurance', tag: 'webhook · GHL' },
  { icon: Sun, label: 'Solar', tag: 'webhook' },
  { icon: Home, label: 'Mortgage', tag: 'webhook · GHL' },
  { icon: Wrench, label: 'Home Services', tag: 'webhook' },
  { icon: Scale, label: 'Legal', tag: 'webhook' },
]

function FlowConnector({ delay = 0.6 }: { delay?: number }) {
  return (
    <>
      <div className="hidden items-center justify-center lg:flex lg:px-1">
        <motion.div
          variants={connectorX(delay)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="h-px w-12 origin-left bg-gradient-to-r from-blue-500/40 via-blue-400/80 to-blue-400"
        />
        <motion.div
          initial={{ opacity: 0, x: -4 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={VIEWPORT}
          transition={{ delay: delay + 0.25, duration: 0.3 }}
        >
          <ChevronRight size={15} className="text-blue-400/80" />
        </motion.div>
      </div>
      <div className="flex flex-col items-center justify-center py-2 lg:hidden">
        <motion.div
          variants={connectorY(delay)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="h-8 w-px origin-top bg-gradient-to-b from-blue-500/40 via-blue-400/80 to-blue-400"
        />
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ delay: delay + 0.2, duration: 0.3 }}
        >
          <ChevronDown size={15} className="text-blue-400/80" />
        </motion.div>
      </div>
    </>
  )
}

export function DistributionEngineSection() {
  return (
    <section id="how-it-works" className="relative overflow-hidden py-20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(59,130,246,0.06),transparent)]" />
      <div className="relative mx-auto max-w-6xl px-5">
        <SectionHeader
          eyebrow="The Distribution Engine"
          eyebrowClass="text-blue-400/80"
          title={
            <>
              The Distribution Engine Behind{' '}
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                Every Lead
              </span>
            </>
          }
          subtitle="Five source types in, one pipeline, then out to whichever buyer you've configured — in milliseconds, fully automated."
        />

        <motion.div
          variants={stagger(0.05, 0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="flex flex-col lg:grid lg:grid-cols-[1fr_3rem_1.5fr_3rem_1fr] lg:items-center lg:gap-1"
        >
          {/* Sources */}
          <motion.div variants={fadeInUp} className="lg:pr-1">
            <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 lg:text-left">
              Lead Sources
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {SOURCES.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-surface-card/60 px-3 py-2.5"
                >
                  <s.icon size={14} className="shrink-0 text-blue-400/80" />
                  <span className="text-[11px] font-medium text-white/85">{s.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <FlowConnector />

          {/* Pipeline */}
          <motion.div variants={fadeInUp} className="relative my-6 lg:my-0">
            <div className="rounded-2xl border border-blue-500/20 bg-surface-card/80 p-5 shadow-xl shadow-blue-500/5">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-[9px] font-bold tracking-wider text-white">
                  LF
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
                    LeadFlowX Routing Pipeline
                    <Sparkles size={12} className="text-blue-400" />
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">
                    Every lead passes through all six stages.
                  </p>
                </div>
              </div>

              <div className="relative">
                <motion.svg
                  className="absolute left-[15px] top-6 bottom-6 w-0.5"
                  viewBox="0 0 2 100"
                  preserveAspectRatio="none"
                >
                  <motion.path
                    d="M1 0 L1 100"
                    stroke="currentColor"
                    className="text-blue-500/40"
                    strokeWidth="2"
                    strokeLinecap="round"
                    variants={spineDraw(0.7)}
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT}
                  />
                </motion.svg>
                {STAGES.map((s, i) => (
                  <div key={s.label} className="relative flex items-center gap-4 px-2 py-2">
                    <div className="relative z-10 flex h-3 w-3 shrink-0 rounded-full border border-blue-500/60 bg-surface-dark">
                      <div className="m-auto h-1 w-1 rounded-full bg-blue-400/80" />
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <s.icon size={14} className="shrink-0 text-blue-400/90" />
                      <span className="text-[12px] font-medium text-white/90">{s.label}</span>
                      <span className="ml-auto hidden text-[10px] text-muted-foreground/55 sm:block">
                        {s.desc}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-blue-400/40">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <FlowConnector delay={0.75} />

          {/* Buyers */}
          <motion.div variants={fadeInUp} className="lg:pl-1">
            <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 lg:text-left">
              Buyers & Verticals
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {BUYERS.map((b) => (
                <div
                  key={b.label}
                  className="flex items-center gap-2 rounded-lg border border-emerald-500/15 bg-surface-card/60 px-3 py-2.5"
                >
                  <b.icon size={14} className="shrink-0 text-emerald-400/90" />
                  <span className="text-[11px] font-medium text-white/85">{b.label}</span>
                  <span className="ml-auto hidden rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground/60 md:block">
                    {b.tag}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="mt-12 flex justify-center"
        >
          <CTAPair primaryLabel="Start Routing Leads" secondaryLabel="See Pricing" />
        </motion.div>
      </div>
    </section>
  )
}

export default DistributionEngineSection