import { Suspense } from 'react'
import Navbar from '@/components/layout/Navbar'
import Hero from '@/components/landing/Hero'
import StudioShowcase from '@/components/landing/StudioShowcase'
import Features from '@/components/landing/Features'
import HowItWorks from '@/components/landing/HowItWorks'
import Pricing from '@/components/landing/Pricing'
import Testimonials from '@/components/landing/Testimonials'
import FAQ from '@/components/landing/FAQ'
import Footer from '@/components/layout/Footer'

function HeroSkeleton() {
  return <div className="min-h-[100vh] bg-[#020209]" />
}
function PricingSkeleton() {
  return <div className="py-28 bg-[#131313]" />
}
function SectionSkeleton() {
  return <div className="py-28" />
}

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Suspense fallback={<HeroSkeleton />}>
          <Hero />
        </Suspense>
        <StudioShowcase />
        <HowItWorks />
        <Features />
        <Suspense fallback={<PricingSkeleton />}>
          <Pricing />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <Testimonials />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <FAQ />
        </Suspense>
        {/* CTA Banner */}
        <div className="mx-8 mb-20 rounded-3xl px-12 py-24 text-center relative overflow-hidden" style={{ backgroundColor: '#06070F', border: '1px solid rgba(45,126,255,0.12)' }}>
          <div className="absolute pointer-events-none" style={{ top: '-100px', right: '-60px', width: 500, height: 500, borderRadius: 9999, backgroundColor: 'rgba(45,126,255,0.06)', filter: 'blur(100px)' }} />
          <h2
            className="text-5xl md:text-7xl font-normal tracking-tight leading-tight mb-5 relative"
            style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', color: '#E8ECFF' }}
          >
            Crie conteúdo que<br />
            <em style={{ color: '#2D7EFF' }}>converte de verdade</em>
          </h2>
          <p className="text-lg mb-10 relative" style={{ color: 'rgba(232,236,255,0.4)' }}>Comece agora. Acesso imediato ao Studio.</p>
          <a
            href="/dashboard/studio"
            className="inline-block text-white text-base font-semibold px-10 py-4 rounded transition-all duration-200 hover:opacity-90 relative"
            style={{ backgroundColor: '#2D7EFF' }}
          >
            Acessar o Studio →
          </a>
        </div>
      </main>
      <Footer />
    </>
  )
}
