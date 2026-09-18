import { motion } from 'framer-motion'
import {
  Brain,
  Target,
  BarChart3,
  Activity,
  ShieldCheck,
  FileJson,
  Sparkles,
} from 'lucide-react'
import { CTAPair } from './CTAPair'
import { SectionHeader } from './SectionHeader'
import { fadeInUp, fadeInUpDelayed, drawLineDelayed, VIEWPORT } from './motion'

const CAPABILITIES = [
  { icon: Brain, label: 'Lead Scoring', desc: 'Claude scores every lead 0–100 with one-line reasoning.' },
  { icon: Target, label: 'Buyer Intelligence', desc: 'Min-score routing, caps, and priority weights per buyer.' },
  { icon: BarChart3, label: 'Campaign Insights', desc: 'Activity, costs, and buyer distribution in one report.' },
  { icon: Activity, label: 'Delivery Tracking', desc: 'Live attempts, retries, and acceptance logs per lead.' },
  { icon: ShieldCheck, label: 'Duplicate & Fraud Guard', desc: 'Window-based dedup plus contact plausibility checks.' },
  { icon: FileJson, label: 'Payload Templates', desc: 'Map any lead field to any buyer\u2019s webhook format.' },
]

const capOf = (label: string) => CAPABILITIES.find((c) => c.label === label)!

const RAY_ENDPOINTS = [
  { x: 16.667, y: 16.667 },
  { x: 83.333, y: 16.667 },
  { x: 16.667, y: 50 },
  { x: 83.333, y: 50 },
  { x: 16.667, y: 83.333 },
  { x: 83.333, y: 83.333 },
]

function CapabilityCard({ icon: Icon, label, desc, delay = 0 }: { icon: React.ElementType; label: string; desc: string; delay?: number }) {
  return (
    <motion.div
      variants={fadeInUpDelayed(delay)}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      className="flex min-h-[150px] w-full max-w-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-surface-card p-4 text-center"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
        <Icon size={16} className="text-blue-400" />
      </span>
      <span className="text-[11px] font-semibold text-white/90">{label}</span>
      <span className="text-[10px] leading-relaxed text-muted-foreground/60">{desc}</span>
    </motion.div>
  )
}

function HubCircle({ className = '' }: { className?: string }) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      className={`flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-700 shadow-xl shadow-blue-500/30 ${className}`}
    >
      <Sparkles size={20} className="text-white" />
      <span className="text-[10px] font-bold text-white">LeadFlowX AI</span>
    </motion.div>
  )
}

export function AIScoringSection() {
  return (
    <section id="features" className="py-20">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeader
          eyebrow="Built-In AI"
          eyebrowClass="text-blue-400/80"
          title={
            <>
              Run Your Lead Operations with{' '}
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                AI-Powered Scoring
              </span>
            </>
          }
          subtitle="Every incoming lead is scored in real time by Claude — so you can route on intent, not guesswork. No chatbot, no noise: just a quality signal wired straight into your routing decisions."
        />

        <div className="relative isolate mx-auto max-w-5xl">
          <div className="pointer-events-none absolute inset-0 -z-10 hidden md:block" aria-hidden="true">
            <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {RAY_ENDPOINTS.map((p, i) => (
                <motion.path
                  key={i}
                  d={`M50 50 L${p.x} ${p.y}`}
                  stroke="currentColor"
                  className="text-blue-500/35"
                  strokeWidth="1.5"
                  strokeDasharray="4 5"
                  variants={drawLineDelayed(0.45 + i * 0.09)}
                  initial="hidden"
                  whileInView="visible"
                  viewport={VIEWPORT}
                />
              ))}
            </svg>
          </div>

          <div className="grid grid-cols-1 items-center justify-items-center gap-6 md:grid-cols-3">
            <CapabilityCard {...capOf('Campaign Insights')} delay={0.73} />
            <div className="hidden md:block" aria-hidden="true" />
            <CapabilityCard {...capOf('Buyer Intelligence')} delay={0.82} />
            <CapabilityCard {...capOf('Delivery Tracking')} delay={0.64} />
            <HubCircle className="order-first md:order-none" />
            <CapabilityCard {...capOf('Lead Scoring')} delay={0.55} />
            <CapabilityCard {...capOf('Duplicate & Fraud Guard')} delay={0.91} />
            <div className="hidden md:block" aria-hidden="true" />
            <CapabilityCard {...capOf('Payload Templates')} delay={1} />
          </div>
        </div>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="mt-16 flex justify-center"
        >
          <CTAPair primaryLabel="Try AI Scoring" secondaryLabel="Read the FAQ" secondaryHref="#faq" />
        </motion.div>
      </div>
    </section>
  )
}

export default AIScoringSection