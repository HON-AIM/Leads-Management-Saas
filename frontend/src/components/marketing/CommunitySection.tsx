import { motion } from 'framer-motion'
import { Users, MessageSquare, ArrowRight } from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { fadeInUp, VIEWPORT } from './motion'

export function CommunitySection() {
  return (
    <section id="community" className="py-20">
      <div className="mx-auto max-w-2xl px-5 text-center">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10"
        >
          <Users size={20} className="text-blue-400" />
        </motion.div>
        <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={VIEWPORT}>
          <SectionHeader
            eyebrow="Community"
            eyebrowClass="text-blue-400/80"
            title="Join Our Community"
            subtitle="Swap routing strategies, share buyer feedback, and get direct access to the team building LeadFlowX."
          />
        </motion.div>
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-[14px] font-semibold text-white transition hover:bg-blue-700"
            aria-label="Join the Discord community (channel coming soon)"
          >
            <MessageSquare size={15} />
            Join the Discord
            <ArrowRight size={14} />
          </a>
          <span className="text-[11px] text-muted-foreground/50">Community channel coming soon — link placeholder</span>
        </motion.div>
      </div>
    </section>
  )
}

export default CommunitySection