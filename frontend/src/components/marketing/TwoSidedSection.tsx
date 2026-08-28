import { motion } from 'framer-motion'
import { Check, Store, Factory, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'
import { SectionHeader } from './SectionHeader'
import { fadeInUp, stagger, VIEWPORT } from './motion'

const SELLER_COLUMN = {
  icon: Store,
  title: 'Lead & Call Sellers and Brokers',
  subtitle: 'You generated the demand — get paid faster and stop babysitting spreadsheets.',
  bullets: [
    'Automated routing to your buyer list, no manual pings',
    'Set your own daily, weekly, or total intake caps',
    'See every delivery attempt and prove leads were sent',
    'Weighted pricing and priority for your best buyers',
    'Works from GoHighLevel, Facebook Lead Ads, or a simple webhook',
  ],
}

const BUYER_COLUMN = {
  icon: Factory,
  title: 'Lead & Call Buyers and Brands',
  subtitle: 'Buy pipeline into your CRM in the exact format your sales team already uses.',
  bullets: [
    'State / country targeting so leads land where you sell',
    'AI minimum-score filters — only high-intent leads in',
    'Round-robin and caps keep intake fair and predictable',
    'Payload templates map fields straight into your CRM',
    'Live delivery logs with automatic retries when you\u2019re offline',
  ],
}

function SideCard({ column }: { column: typeof SELLER_COLUMN }) {
  const Icon = column.icon
  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/[0.08] bg-surface-card/60 p-6 sm:p-7">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
        <Icon size={18} className="text-blue-400" />
      </div>
      <h3 className="text-[18px] font-semibold text-white/95">{column.title}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground/70">{column.subtitle}</p>
      <ul className="mt-5 flex-1 space-y-2.5">
        {column.bullets.map((b) => (
          <li key={b} className="flex items-start gap-2.5 text-[12px] leading-relaxed text-slate-300">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
              <Check size={10} className="text-emerald-400" />
            </span>
            {b}
          </li>
        ))}
      </ul>
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Link
          to={ROUTES.LOGIN}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700"
        >
          Get Started
          <ArrowRight size={13} />
        </Link>
        <a
          href="#pricing"
          className="rounded-lg border border-white/[0.08] px-4 py-2 text-[12px] font-medium text-slate-300 transition hover:border-white/[0.14] hover:text-white"
        >
          See Pricing
        </a>
      </div>
    </div>
  )
}

export function TwoSidedSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeader
          eyebrow="Who It's For"
          eyebrowClass="text-amber-400/80"
          title={
            <>
              Built for Every Side of the{' '}
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                Lead Economy
              </span>
            </>
          }
          subtitle="Whether you sell the leads or buy them, LeadFlowX is the routing layer that keeps both sides honest, fast, and predictable."
        />

        <motion.div
          variants={stagger(0.05, 0.12)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="grid gap-4 md:grid-cols-2"
        >
          <motion.div variants={fadeInUp}>
            <SideCard column={SELLER_COLUMN} />
          </motion.div>
          <motion.div variants={fadeInUp}>
            <SideCard column={BUYER_COLUMN} />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export default TwoSidedSection