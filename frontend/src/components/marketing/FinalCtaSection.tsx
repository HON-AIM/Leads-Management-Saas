import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { fadeInUp, VIEWPORT } from './motion'

export function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(59,130,246,0.1),transparent)]" />
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT}
        className="relative mx-auto max-w-2xl px-5 text-center"
      >
        <h2 className="text-[28px] font-bold tracking-tight sm:text-[34px]">
          Ready to route leads in{' '}
          <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            seconds, not hours?
          </span>
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-[14px] leading-relaxed text-muted-foreground/70">
          Create a campaign, add your buyers, and let the pipeline do the rest. No credit card
          required to start.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to={ROUTES.LOGIN}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-[14px] font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800"
          >
            Start Free Trial
            <ArrowRight size={15} />
          </Link>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-6 py-3 text-[14px] font-medium text-slate-300 transition hover:border-white/[0.14] hover:text-white"
          >
            Compare Plans
          </a>
        </div>
      </motion.div>
    </section>
  )
}

export default FinalCtaSection