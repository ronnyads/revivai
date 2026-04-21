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
import { ArrowRight } from 'lucide-react'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#1c1b1d] ${className}`} />
}

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="bg-[#131315]">
        <Suspense fallback={<Skeleton className="min-h-screen" />}>
          <Hero />
        </Suspense>

        <StudioShowcase />
        
        <HowItWorks />
        
        <Features />

        <Suspense fallback={<Skeleton className="h-96" />}>
          <Pricing />
        </Suspense>

        <Suspense fallback={<Skeleton className="h-96" />}>
          <Testimonials />
        </Suspense>

        <Suspense fallback={<Skeleton className="h-96" />}>
          <FAQ />
        </Suspense>

        {/* CTA Banner — Neo-Couture Synthesis Style */}
        <section className="py-32 px-6">
          <div className="max-w-7xl mx-auto relative overflow-hidden bg-[#201f22] border border-white/5 p-12 md:p-24 text-center">
            {/* Visual Accents */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4FF00] opacity-5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#D4FF00] opacity-5 blur-[120px] pointer-events-none" />
            
            <div className="relative z-10 max-w-4xl mx-auto">
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#D4FF00] mb-8">
                PRONTO PARA O PRÓXIMO NÍVEL?
              </p>
              
              <h2 className="text-5xl md:text-[5rem] font-bold font-display uppercase tracking-tighter leading-[0.9] mb-10">
                CRIE CONTEÚDO QUE <br />
                <span className="text-white/20">CONVERTE DE VERDADE</span>
              </h2>
              
              <p className="text-lg md:text-xl text-white/40 mb-12 max-w-2xl mx-auto font-sans">
                Junte-se a centenas de marcas que já escalaram sua produção visual 
                usando o Reviv.ai Studio.
              </p>

              <a
                href="/dashboard/studio"
                className="inline-flex items-center gap-3 px-12 py-5 bg-[#D4FF00] text-[#131315] font-bold text-xs uppercase tracking-[0.2em] hover:bg-white transition-all duration-500"
              >
                ACESSAR O STUDIO <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
