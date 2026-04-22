import { Suspense } from 'react'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Hero from '@/components/landing/Hero'
import StudioShowcase from '@/components/landing/StudioShowcase'
import Features from '@/components/landing/Features'
import HowItWorks from '@/components/landing/HowItWorks'
import Pricing from '@/components/landing/Pricing'
import Testimonials from '@/components/landing/Testimonials'
import FAQ from '@/components/landing/FAQ'
import Footer from '@/components/layout/Footer'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#1B1B1B] ${className}`} />
}

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="obsidian-shell">
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

        <section className="px-6 py-36">
          <div className="panel-card group relative mx-auto max-w-7xl overflow-hidden p-16 text-center md:p-28">
            <div className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] bg-[#00ADCC]/10 blur-[150px] opacity-0 transition-opacity duration-1000 group-hover:opacity-100" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-[360px] w-[360px] bg-[#54D6F6]/6 blur-[140px]" />

            <div className="relative z-10 mx-auto max-w-4xl">
              <p className="font-label mb-10 inline-block text-[10px] text-[#54D6F6]">Núcleo operacional</p>

              <h2 className="font-display mb-10 text-5xl font-bold uppercase tracking-[-0.05em] leading-[0.85] md:text-[6rem]">
                PRONTO PARA
                <br />
                <span className="italic text-[#54D6F6]">INFILTRAR</span> O FUTURO?
              </h2>

              <p className="mx-auto mb-14 max-w-2xl text-lg leading-relaxed text-white/42 md:text-xl">
                Entre no estúdio e escale restauração, direção criativa e geração visual com um fluxo premium centrado no cliente.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/dashboard/studio"
                  className="bg-cyan-gradient inline-flex items-center gap-4 rounded-full px-12 py-5 font-label text-xs text-[#003641] shadow-[0_0_40px_rgba(0,173,204,0.18)] transition-all duration-500 hover:-translate-y-0.5"
                >
                  Criar projeto
                  <ArrowRight size={18} className="transition-transform duration-500 group-hover:translate-x-2" />
                </Link>
                <Link
                  href="/dashboard/upload"
                  className="inline-flex items-center gap-4 rounded-full border border-white/10 px-12 py-5 font-label text-xs text-white/72 transition-colors duration-500 hover:border-[#54D6F6]/30 hover:text-white"
                >
                  Restaurar agora
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
