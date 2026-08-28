import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { fadeInUp, VIEWPORT } from './motion'

const FAQ_ITEMS = [
  {
    q: 'How does lead routing work?',
    a: 'Every lead that arrives — via webhook, GoHighLevel, CSV, or manual entry — passes through the same pipeline: normalize, validate, AI score, deduplicate, filter, then assign. Assignment uses the strategy you pick (round robin, weighted, priority, or random), and the best eligible buyer receives the lead over webhook in milliseconds.',
  },
  {
    q: 'Can I set buyer caps?',
    a: 'Yes. Every buyer can have daily, monthly, and total caps. Once a buyer hits a cap they are automatically excluded from routing until the cap resets — scheduler resets run automatically and you can also reset caps manually from the Buyers page.',
  },
  {
    q: 'Does it integrate with GoHighLevel?',
    a: 'Yes, two ways. You can ingest leads into LeadFlowX from GoHighLevel via our webhook, and you can deliver leads to buyers inside GoHighLevel using the native GHL delivery provider (matched by GHL user ID). Anything else plugs in through a standard webhook URL.',
  },
  {
    q: 'What happens to duplicate leads?',
    a: 'A dedup engine checks every incoming lead against your configured time window (default 720 hours) using key contact fields. Matches are flagged and blocked from delivery — you can inspect them in the Leads list rather than double-selling the same lead to your buyers.',
  },
  {
    q: 'What is AI lead scoring and do I need an API key?',
    a: 'When an Anthropic API key is configured, every lead is scored 0–100 by Claude in the background with one-sentence reasoning. Buyers can set a minimum score so low-intent traffic never reaches them. If no key is set, scoring is skipped gracefully and routing works exactly as before.',
  },
  {
    q: 'How are leads delivered to my buyers?',
    a: 'Leads are POSTed to each buyer\u2019s webhook endpoint as JSON. Payload templates let you map any lead field to the exact format your buyer expects, acceptance rules parse the buyer\u2019s response, and failed attempts retry automatically so nothing is silently lost.',
  },
]

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div variants={fadeInUp} className="border-b border-white/[0.08] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="flex items-start gap-3">
          <span className="mt-0.5 font-mono text-[10px] text-blue-400/50">{String(index + 1).padStart(2, '0')}</span>
          <span className="text-[14px] font-medium text-white/90">{q}</span>
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted-foreground/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div className="pb-5 pl-8">
              <p className="text-[13px] leading-relaxed text-muted-foreground/70">{a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function FaqSection() {
  return (
    <section id="faq" className="py-20">
      <div className="mx-auto max-w-2xl px-5">
        <SectionHeader
          eyebrow="FAQ"
          eyebrowClass="text-blue-400/80"
          title="Frequently asked questions"
          subtitle="Straight answers about routing, dedup, scoring, and delivery."
        />
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="rounded-xl border border-white/[0.08] bg-surface-card/40 px-5"
        >
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem key={item.q} q={item.q} a={item.a} index={i} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default FaqSection