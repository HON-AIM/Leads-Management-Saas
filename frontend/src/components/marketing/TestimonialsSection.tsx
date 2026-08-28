import { motion } from 'framer-motion'
import { Star, Info } from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { fadeInUp, stagger, VIEWPORT } from './motion'

/**
 * Replace these with real customer quotes once you have them.
 * `src` marks each as an illustrative placeholder so nothing looks invented.
 */
const TESTIMONIALS = [
  {
    quote:
      'We moved from manual pinging to LeadFlowX in an afternoon. Round-robin finally keeps our buyer list fair, and the delivery logs keep broker disputes from ever starting.',
    role: 'Lead Broker Operations Lead · Insurance vertical',
    src: 'Illustrative placeholder',
  },
  {
    quote:
      'The AI score is the killer feature for us — we set a 70 minimum score on our buyers and stopped wasting their time on junky traffic overnight.',
    role: 'Agency Owner · Solar lead distribution',
    src: 'Illustrative placeholder',
  },
  {
    quote:
      'Setup took minutes, not weeks. Our buyers get leads pushed straight into GoHighLevel with the exact payload our sales team already expects.',
    role: 'Marketing Director · Home services brand',
    src: 'Illustrative placeholder',
  },
]

export function TestimonialsSection() {
  return (
    <section className="py-20 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(59,130,246,0.05),transparent)]">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeader
          eyebrow="Why Companies Switch"
          eyebrowClass="text-emerald-400/80"
          title="Why Companies Switch"
          subtitle="Teams move from spreadsheets and DIY middleware to a routing engine that does the work for them."
        />

        <motion.div
          variants={stagger(0.05, 0.12)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="grid gap-4 md:grid-cols-3"
        >
          {TESTIMONIALS.map((t) => (
            <motion.div
              key={t.role}
              variants={fadeInUp}
              className="flex h-full flex-col rounded-2xl border border-white/[0.08] bg-surface-card/60 p-6"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium text-amber-300/80">
                  <Info size={9} />
                  {t.src}
                </span>
              </div>
              <p className="flex-1 text-[13px] leading-relaxed text-muted-foreground/70">"{t.quote}"</p>
              <div className="mt-5 border-t border-white/[0.08] pt-4">
                <div className="text-[12px] font-medium text-white/85">{t.role}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default TestimonialsSection