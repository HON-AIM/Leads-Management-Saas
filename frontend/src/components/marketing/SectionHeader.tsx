import { motion } from 'framer-motion'
import { fadeInUp, VIEWPORT } from './motion'

interface SectionHeaderProps {
  eyebrow: string
  eyebrowClass?: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  align?: 'center' | 'left'
}

export function SectionHeader({
  eyebrow,
  eyebrowClass = 'text-blue-400/80',
  title,
  subtitle,
  align = 'center',
}: SectionHeaderProps) {
  const alignCls = align === 'center' ? 'text-center mx-auto' : 'text-left'
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      className={`max-w-2xl ${alignCls} mb-12`}
    >
      <p className={`text-[11px] uppercase tracking-wider ${eyebrowClass} mb-2`}>{eyebrow}</p>
      <h2 className="text-[28px] font-bold tracking-tight leading-tight sm:text-[32px]">{title}</h2>
      {subtitle && (
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground/70">{subtitle}</p>
      )}
    </motion.div>
  )
}