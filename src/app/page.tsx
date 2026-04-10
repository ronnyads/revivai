import Navbar from '@/components/layout/Navbar'
import Hero from '@/components/landing/Hero'
import Features from '@/components/landing/Features'
import HowItWorks from '@/components/landing/HowItWorks'
import AiModels from '@/components/landing/AiModels'
import Pricing from '@/components/landing/Pricing'
import Testimonials from '@/components/landing/Testimonials'
import FAQ from '@/components/landing/FAQ'
import Footer from '@/components/layout/Footer'

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <AiModels />
        <Features />
        <Pricing />
        <Testimonials />
        <FAQ />
        {/* CTA Banner */}
        <div className="mx-8 mb-20 bg-ink text-white rounded-3xl px-12 py-24 text-center relative overflow-hidden">
          <div className="absolute w-[600px] h-[600px] rounded-full bg-accent opacity-[0.06] -top-48 -right-24 pointer-events-none" />
          <h2 className="font-display text-5xl md:text-7xl font-normal tracking-tight leading-tight mb-5 relative">
            Suas memórias merecem<br />
            <em className="text-accent italic">viver para sempre</em>
          </h2>
          <p className="text-white/50 text-lg mb-10 relative">Comece agora. Primeira foto com diagnóstico gratuito.</p>
          <a
            href="/dashboard/upload"
            className="inline-block bg-accent text-white text-base font-medium px-10 py-4 rounded border-[1.5px] border-accent hover:bg-accent-dark hover:border-accent-dark transition-all duration-200 shadow-lg shadow-accent/20 relative"
          >
            Restaurar minha foto →
          </a>
        </div>
      </main>
      <Footer />
    </>
  )
}
