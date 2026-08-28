import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Twitter, Github, Linkedin, MessageSquare } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { fadeInUp, VIEWPORT } from './motion'

const LINK_COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'FAQ', href: '#faq' },
      { label: 'Log in', href: ROUTES.LOGIN, internal: true },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Help Center', href: '#' },
      { label: 'API & Webhooks', href: '#how-it-works' },
      { label: 'Community', href: '#community' },
      { label: 'Status', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Security', href: '#' },
    ],
  },
]

const SOCIALS = [
  { icon: Twitter, label: 'Twitter' },
  { icon: Linkedin, label: 'LinkedIn' },
  { icon: Github, label: 'GitHub' },
  { icon: MessageSquare, label: 'Discord' },
]

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/[0.08] py-10">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
            className="lg:col-span-1"
          >
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-[8px] font-bold tracking-wider text-white">
                LF
              </div>
              <span className="text-[13px] font-semibold">LeadFlowX</span>
            </Link>
            <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground/50">
              AI-powered lead distribution for sellers, brokers, and buyers who demand reliability.
            </p>
            <div className="mt-4 flex items-center gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-muted-foreground/50 transition hover:border-white/[0.16] hover:text-white"
                >
                  <s.icon size={14} />
                </a>
              ))}
            </div>
          </motion.div>

          {LINK_COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/40 mb-3">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((l) =>
                  l.internal ? (
                    <li key={l.label}>
                      <Link to={l.href} className="text-[12px] text-muted-foreground/50 transition hover:text-white/80">
                        {l.label}
                      </Link>
                    </li>
                  ) : (
                    <li key={l.label}>
                      <a href={l.href} className="text-[12px] text-muted-foreground/50 transition hover:text-white/80">
                        {l.label}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/[0.08] pt-6 sm:flex-row">
          <p className="text-[11px] font-bold text-muted-foreground">
            &copy; 2026 AIM Digital Labs. All rights reserved.
          </p>
          <p className="text-[11px] text-muted-foreground/35">SOC 2 readiness in progress · 99.9% uptime target</p>
        </div>
      </div>
    </footer>
  )
}

export default MarketingFooter