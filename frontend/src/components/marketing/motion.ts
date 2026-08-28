import type { Variants } from 'framer-motion'

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

export function fadeInUpDelayed(delay = 0): Variants {
  return {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut', delay } },
  }
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } },
}

export const VIEWPORT = { once: true, amount: 0.2 } as const

export function stagger(delay = 0, staggerChildren = 0.08): Variants {
  return {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { delayChildren: delay, staggerChildren } },
  }
}

/** Horizontal animated connector line (scaleX from left origin). */
export const growX: Variants = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: {
    scaleX: 1,
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

/** Vertical animated connector line (scaleY from top origin). */
export const growY: Variants = {
  hidden: { scaleY: 0, opacity: 0 },
  visible: {
    scaleY: 1,
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

/** SVG path draw-in (used for flow-diagram lines). */
export const drawLine: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.6, ease: 'easeInOut' },
  },
}

export function drawLineDelayed(delay = 0): Variants {
  return {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 0.6, ease: 'easeInOut', delay },
    },
  }
}