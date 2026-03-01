import Hero from '@/components/landing/hero'
import Problem from '@/components/landing/problem'
import Solution from '@/components/landing/solution'
import Features from '@/components/landing/features'
import Showcase from '@/components/landing/showcase'
import CTA from '@/components/landing/cta'
import Footer from '@/components/landing/footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Hero />
      <Problem />
      <Solution />
      <Features />
      <Showcase />
      <CTA />
      <Footer />
    </div>
  )
}
