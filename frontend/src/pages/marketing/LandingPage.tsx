import { lazy, Suspense } from 'react'
import { MarketingNav } from '@/components/marketing/MarketingNav'
import { HeroSection } from '@/components/marketing/HeroSection'

// Everything below the hero is code-split so the first paint only needs the
// hero's chunk. Each section loads progressively as the user scrolls.
const DistributionEngineSection = lazy(() => import('@/components/marketing/DistributionEngineSection'))
const StackSection = lazy(() => import('@/components/marketing/StackSection'))
const AIScoringSection = lazy(() => import('@/components/marketing/AIScoringSection'))
const TwoSidedSection = lazy(() => import('@/components/marketing/TwoSidedSection'))
const TestimonialsSection = lazy(() => import('@/components/marketing/TestimonialsSection'))
const CostComparisonSection = lazy(() => import('@/components/marketing/CostComparisonSection'))
const PricingSection = lazy(() => import('@/components/marketing/PricingSection'))
const CommunitySection = lazy(() => import('@/components/marketing/CommunitySection'))
const FaqSection = lazy(() => import('@/components/marketing/FaqSection'))
const FinalCtaSection = lazy(() => import('@/components/marketing/FinalCtaSection'))
const MarketingFooter = lazy(() => import('@/components/marketing/MarketingFooter'))

export function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-dark text-white antialiased">
      <MarketingNav />
      <main>
        <HeroSection />

        <Suspense fallback={<div aria-hidden className="h-[560px]" />}>
          <DistributionEngineSection />
        </Suspense>

        <Suspense fallback={<div aria-hidden className="h-[520px]" />}>
          <StackSection />
        </Suspense>

        <Suspense fallback={<div aria-hidden className="h-[520px]" />}>
          <AIScoringSection />
        </Suspense>

        <Suspense fallback={<div aria-hidden className="h-[420px]" />}>
          <TwoSidedSection />
        </Suspense>

        <Suspense fallback={<div aria-hidden className="h-[380px]" />}>
          <TestimonialsSection />
        </Suspense>

        <Suspense fallback={<div aria-hidden className="h-[360px]" />}>
          <CostComparisonSection />
        </Suspense>

        <Suspense fallback={<div aria-hidden className="h-[560px]" />}>
          <PricingSection />
        </Suspense>

        <Suspense fallback={<div aria-hidden className="h-[280px]" />}>
          <CommunitySection />
        </Suspense>

        <Suspense fallback={<div aria-hidden className="h-[420px]" />}>
          <FaqSection />
        </Suspense>

        <Suspense fallback={<div aria-hidden className="h-[320px]" />}>
          <FinalCtaSection />
        </Suspense>
      </main>

      <Suspense fallback={<div aria-hidden className="h-64" />}>
        <MarketingFooter />
      </Suspense>
    </div>
  )
}

export default LandingPage