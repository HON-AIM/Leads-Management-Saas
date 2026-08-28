import { motion } from 'framer-motion'
import { PlugZap } from 'lucide-react'
import { CTAPair } from './CTAPair'
import { SectionHeader } from './SectionHeader'
import { fadeInUp, fadeInUpDelayed, VIEWPORT } from './motion'

const INTEGRATIONS = [
  { monogram: 'GHL', name: 'GoHighLevel', chip: 'bg-violet-500', text: 'text-white' },
  { monogram: 'M', name: 'Meta / Facebook', chip: 'bg-sky-600', text: 'text-white' },
  { monogram: 'G', name: 'Google Ads', chip: 'bg-slate-900', text: 'text-white' },
  { monogram: 'Z', name: 'Zapier', chip: 'bg-orange-500', text: 'text-white' },
  { monogram: 'W', name: 'Any Webhook', chip: 'bg-blue-600', text: 'text-white' },
  { monogram: 'K', name: 'Supplier API Keys', chip: 'bg-emerald-500', text: 'text-white' },
]

const RING_POSITIONS = [
  'col-start-1 col-end-2',
  'col-start-2 col-end-3',
  'col-start-3 col-end-4',
  'col-start-1 col-end-2 row-start-3 row-end-4',
  'col-start-3 col-end-4 row-start-3 row-end-4',
  'col-start-2 col-end-3 row-start-3 row-end-4',
]

export function StackSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeader
          eyebrow="Integrations"
          eyebrowClass="text-emerald-400/80"
          title={
            <>
              Connects with{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                Your Entire Stack
              </span>
            </>
          }
          subtitle="Pull leads in from the tools you already use and push them out to your buyers — with native GoHighLevel delivery and a webhook for everything else."
        />

        {/* Light panel */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="relative rounded-3xl bg-white p-6 shadow-2xl shadow-emerald-500/5 sm:p-10"
        >
          <div className="mb-3 text-center">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Hub &amp; spoke
            </span>
          </div>
          {/* Desktop ring diagram */}
          <div className="hidden place-items-center gap-4 md:grid md:grid-cols-3 md:grid-rows-3">
            {INTEGRATIONS.slice(0, 6).map((it, i) => (
              <motion.div
                key={it.name}
                variants={fadeInUpDelayed(0.1 + i * 0.09)}
                initial="hidden"
                whileInView="visible"
                viewport={VIEWPORT}
                className={`flex w-full max-w-[220px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm ${RING_POSITIONS[i]}`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${it.chip} ${it.text}`}>
                  {it.monogram}
                </div>
                <span className="text-[12px] font-semibold text-slate-800">{it.name}</span>
              </motion.div>
            ))}
            <div className="col-start-2 col-end-3 row-start-2 row-end-3 flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-[10px] font-bold text-white">
                LF
              </div>
              <span className="text-[10px] font-semibold text-white">LeadFlowX</span>
            </div>
          </div>

          {/* Mobile layout */}
          <div className="md:hidden">
            <div className="mb-5 flex justify-center">
              <div className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/20 text-[8px] font-bold text-white">
                  LF
                </div>
                <span className="text-[9px] font-semibold text-white">LeadFlowX</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {INTEGRATIONS.map((it, i) => (
                <motion.div
                  key={it.name}
                  variants={fadeInUpDelayed(0.1 + i * 0.06)}
                  initial="hidden"
                  whileInView="visible"
                  viewport={VIEWPORT}
                  className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${it.chip} ${it.text}`}>
                    {it.monogram}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800">{it.name}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.p
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
            className="mt-6 flex items-center justify-center gap-2 text-center text-[12px] text-slate-500"
          >
            <PlugZap size={13} className="text-blue-600" />
            Anything with a webhook can plug in — Payload Templates map fields to any buyer format.
          </motion.p>
        </motion.div>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="mt-10 flex justify-center"
        >
          <CTAPair primaryLabel="Connect Your Stack" secondaryLabel="Explore Features" secondaryHref="#features" />
        </motion.div>
      </div>
    </section>
  )
}

export default StackSection