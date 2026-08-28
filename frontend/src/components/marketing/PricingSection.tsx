import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'
import { SectionHeader } from './SectionHeader'
import { fadeInUp, stagger, VIEWPORT } from './motion'

/**
 * Marketing-only pricing tiers. Not wired to a billing system —
 * structured as plain data so real subscription logic can be swapped in later.
 */
const PLANS = [
  {
    name: 'Starter',
    tagline: 'For small teams automating their first route.',
    monthly: 0,
    annual: 0,
    cta: 'Start for free',
    popular: false,
    features: [
      '1 campaign',
      'Up to 5 buyers',
      '1,000 leads / month',
      'Round robin & priority routing',
      'Webhook delivery',
      'Duplicate protection',
      'Email support',
    ],
  },
  {
    name: 'Growth',
    tagline: 'For agencies routing serious volume.',
    monthly: 149,
    annual: 119,
    cta: 'Start free trial',
    popular: true,
    features: [
      '10 campaigns',
      'Unlimited buyers',
      '50,000 leads / month',
      'Weighted + priority + round robin',
      'AI lead scoring (0–100)',
      'GoHighLevel delivery',
      'Payload templates & acceptance rules',
      'Live delivery logs with retries',
      'Priority support',
    ],
  },
  {
    name: 'Scale',
    tagline: 'For brands and brokerages with custom needs.',
    monthly: null,
    annual: null,
    custom: true,
    cta: 'Contact sales',
    popular: false,
    features: [
      'Unlimited campaigns & leads',
      'Custom routing strategies',
      'Dedicated success manager',
      'SSO & advanced RBAC',
      'Custom SLAs & uptime guarantee',
      'Private deployment options',
    ],
  },
]

export function PricingSection() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual')

  const displayPrice = useMemo(
    () =>
      ({ monthly, annual }: { monthly: number | null; annual: number | null }) => {
        if (monthly === null) return null
        return billing === 'annual' ? annual ?? monthly : monthly
      },
    [billing]
  )

  return (
    <section id="pricing" className="py-20">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeader
          eyebrow="Pricing"
          eyebrowClass="text-emerald-400/80"
          title="Simple, transparent pricing"
          subtitle="Start free. Upgrade when your lead volume does. Pricing shown for planning — billing integration ships soon."
        />

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="mb-10 flex justify-center"
        >
          <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-surface-card/60 p-1">
            {(['monthly', 'annual'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setBilling(mode)}
                className={`rounded-full px-4 py-1.5 text-[12px] font-medium transition ${
                  billing === mode ? 'bg-blue-600 text-white' : 'text-muted-foreground/70 hover:text-white'
                }`}
              >
                {mode === 'monthly' ? 'Monthly' : `Annual`}
                {mode === 'annual' && (
                  <span className="ml-1.5 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">
                    −20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          variants={stagger(0.05, 0.12)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3"
        >
          {PLANS.map((p) => {
            const price = displayPrice(p)
            return (
              <motion.div
                key={p.name}
                variants={fadeInUp}
                className={`relative flex h-full flex-col rounded-2xl border p-6 ${
                  p.popular
                    ? 'border-blue-500/30 bg-surface-card shadow-xl shadow-blue-500/10'
                    : 'border-white/[0.08] bg-surface-card/60'
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-semibold text-white">
                    Most Popular
                  </div>
                )}
                <h3 className="text-[16px] font-semibold text-white/95">{p.name}</h3>
                <p className="mt-1 text-[12px] text-muted-foreground/60">{p.tagline}</p>
                <div className="mt-5 flex items-end gap-1">
                  {price !== null ? (
                    <>
                      <span className="text-[30px] font-bold leading-none text-white">${price}</span>
                      <span className="pb-0.5 text-[12px] text-muted-foreground/50">
                        /mo {billing === 'annual' && p.monthly !== 0 && <span>· billed yearly</span>}
                      </span>
                    </>
                  ) : (
                    <span className="text-[24px] font-bold leading-none text-white">Custom</span>
                  )}
                </div>
                {price === 0 && (
                  <p className="mt-1 text-[10px] text-emerald-300/80">Free forever · no credit card</p>
                )}
                <ul className="mt-6 flex-1 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[12px] text-slate-300">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                        <Check size={10} className="text-emerald-400" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={ROUTES.LOGIN}
                  className={`mt-7 block w-full rounded-xl py-2.5 text-center text-[13px] font-semibold transition ${
                    p.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-white/[0.1] text-white/85 hover:bg-white/[0.04]'
                  }`}
                >
                  {p.cta}
                </Link>
              </motion.div>
            )
          })}
        </motion.div>

        <motion.p
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="mt-8 flex items-center justify-center gap-2 text-center text-[11px] text-muted-foreground/50"
        >
          <Zap size={12} className="text-amber-400" />
          Every plan includes AI scoring, duplicate protection, and unlimited delivery attempts.
        </motion.p>
      </div>
    </section>
  )
}

export default PricingSection