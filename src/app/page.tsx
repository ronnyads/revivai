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
        <section className="py-40 px-6">
          <div className="max-w-7xl mx-auto relative overflow-hidden bg-white/[0.02] backdrop-blur-3xl border border-white/5 p-16 md:p-32 text-center group">
            {/* Visual Accents */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#7C0DF2]/10 blur-[150px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#7C0DF2]/5 blur-[150px] pointer-events-none" />
            
            <div className="relative z-10 max-w-4xl mx-auto">
              <p className="text-[9px] font-bold uppercase tracking-[0.5em] text-[#7C0DF2] mb-10 shadow-[0_0_15px_rgba(124,13,242,0.2)] inline-block">
                ETHEREAL PERFORMANCE
              </p>
              
              <h2 className="text-5xl md:text-[6rem] font-bold font-display uppercase tracking-[-0.04em] leading-[0.85] mb-12">
                TRANSFORME VISÕES EM <br />
                <span className="text-white/20">REALIDADE DIGITAL</span>
              </h2>
              
              <p className="text-lg md:text-xl text-white/30 mb-16 max-w-xl mx-auto font-sans leading-relaxed">
                A tecnologia que as marcas do futuro usam para escalar sua presença visual com o Reviv.ai Studio.
              </p>
 
              <a
                href="/dashboard/studio"
                className="inline-flex items-center gap-4 px-16 py-6 rounded-full bg-[#7C0DF2] text-[#131315] font-bold text-xs uppercase tracking-[0.3em] hover:bg-white transition-all duration-700 shadow-[0_0_40px_rgba(124,13,242,0.15)] hover:shadow-[0_0_50px_rgba(255,255,255,0.2)]"
              >
                COMEÇAR AGORA <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform duration-500" />
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
