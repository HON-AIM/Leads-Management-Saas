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

// Chip center coordinates inside the 0 0 400 420 viewBox space.
const RAY_ENDPOINTS = [
  { x: 375, y: 210, left: '93.75%', top: '50%' },
  { x: 287.5, y: 58.5, left: '71.875%', top: '13.93%' },
  { x: 112.5, y: 58.5, left: '28.125%', top: '13.93%' },
  { x: 25, y: 210, left: '6.25%', top: '50%' },
  { x: 112.5, y: 361.5, left: '28.125%', top: '86.07%' },
  { x: 287.5, y: 361.5, left: '71.875%', top: '86.07%' },
]

function CapabilityCard({ icon: Icon, label, desc }: { icon: React.ElementType; label: string; desc: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.07] bg-surface-card/60 p-3 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
        <Icon size={16} className="text-blue-400" />
      </span>
      <span className="text-[11px] font-semibold text-white/90">{label}</span>
      <span className="text-[10px] leading-relaxed text-muted-foreground/60">{desc}</span>
    </div>
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

        {/* Desktop hub-and-spoke */}
        <div className="relative mx-auto hidden h-[440px] max-w-3xl md:block">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 420" preserveAspectRatio="none">
            {RAY_ENDPOINTS.map((p, i) => (
              <motion.path
                key={i}
                d={`M200 210 L${p.x} ${p.y}`}
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

          {/* center badge */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
            className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-700 shadow-xl shadow-blue-500/30"
          >
            <Sparkles size={20} className="text-white" />
            <span className="text-[10px] font-bold text-white">LeadFlowX AI</span>
          </motion.div>

          {RAY_ENDPOINTS.map((p, i) => {
            const cap = CAPABILITIES[i]
            const Icon = cap.icon
            return (
              <motion.div
                key={cap.label}
                variants={fadeInUpDelayed(0.55 + i * 0.09)}
                initial="hidden"
                whileInView="visible"
                viewport={VIEWPORT}
                className="absolute w-36 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/[0.08] bg-surface-card/90 p-3 text-center shadow-lg"
                style={{ left: p.left, top: p.top }}
              >
                <span className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                  <Icon size={16} className="text-blue-400" />
                </span>
                <p className="text-[11px] font-semibold text-white/90">{cap.label}</p>
                <p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground/60">{cap.desc}</p>
              </motion.div>
            )
          })}
        </div>

        {/* Mobile: stacked hub + grid */}
        <div className="md:hidden">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
            className="mx-auto mb-6 flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-700 shadow-xl shadow-blue-500/30"
          >
            <Sparkles size={18} className="text-white" />
            <span className="text-[9px] font-bold text-white">LeadFlowX AI</span>
          </motion.div>
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
          >
            {CAPABILITIES.map((cap) => (
              <CapabilityCard key={cap.label} icon={cap.icon} label={cap.label} desc={cap.desc} />
            ))}
          </motion.div>
        </div>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="mt-12 flex justify-center"
        >
          <CTAPair primaryLabel="Try AI Scoring" secondaryLabel="Read the FAQ" secondaryHref="#faq" />
        </motion.div>
      </div>
    </section>
  )
}

export default AIScoringSection