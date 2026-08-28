import { motion } from 'framer-motion'
import { SectionHeader } from './SectionHeader'
import { CTAPair } from './CTAPair'
import { fadeInUp, VIEWPORT } from './motion'

const ROWS = [
  {
    name: 'LeadFlowX',
    price: 'from $0 /mo',
    width: '22%',
    barClass: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
    note: 'Routing, AI scoring, dedup, and delivery in one plan.',
  },
  {
    name: 'Typical routing middleware',
    price: '$750–$1,500 /mo',
    width: '88%',
    barClass: 'bg-gradient-to-r from-red-500/80 to-red-400/70',
    note: 'Platform + middleware + per-lead fees and seats on top.',
  },
]

export function CostComparisonSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-4xl px-5">
        <SectionHeader
          eyebrow="The Economics"
          eyebrowClass="text-emerald-400/80"
          title={
            <>
              Enterprise Power.{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                A Fraction of the Cost.
              </span>
            </>
          }
          subtitle="You shouldn't need a data-engineering team to route leads. One flat plan — no per-lead fees, no add-on modules."
        />

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="space-y-6 rounded-2xl border border-white/[0.08] bg-surface-card/50 p-6 sm:p-8"
        >
          {ROWS.map((r) => (
            <div key={r.name}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-semibold text-white/90">{r.name}</span>
                <span className={`text-[12px] font-semibold ${r.barClass.includes('emerald') ? 'text-emerald-300' : 'text-red-300'}`}>
                  {r.price}
                </span>
              </div>
              <div className="h-6 overflow-hidden rounded-full bg-white/[0.04]">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: r.width }}
                  viewport={VIEWPORT}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${r.barClass}`}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground/55">{r.note}</p>
            </div>
          ))}
          <p className="border-t border-white/[0.08] pt-4 text-[10px] leading-relaxed text-muted-foreground/45">
            Illustrative ranges based on public list pricing for comparable routing middleware and
            typical enterprise setups. Verify current vendor pricing before quoting against a
            specific competitor.
          </p>
        </motion.div>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="mt-10 flex justify-center"
        >
          <CTAPair primaryLabel="Start Free" secondaryLabel="See All Pricing" />
        </motion.div>
      </div>
    </section>
  )
}

export default CostComparisonSection