'use client'
import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'

type Stats = { photos: number; models: number; satisfaction: number; avgTime: number }

export default function HeroClient({ stats }: { stats: Stats }) {
  useEffect(() => {
    const counters = document.querySelectorAll<HTMLElement>('[data-count]')
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return
        const el = e.target as HTMLElement
        const target = +(el.dataset.count || 0)
        const suffix = el.dataset.suffix || ''
        let cur = 0
        const step = target / 60
        const timer = setInterval(() => {
          cur = Math.min(cur + step, target)
          el.textContent = Math.floor(cur).toLocaleString('pt-BR') + suffix
          if (cur >= target) clearInterval(timer)
        }, 16)
        obs.unobserve(el)
      })
    }, { threshold: 0.5 })
    counters.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <>
      <section className="relative pt-40 pb-20 min-h-[95vh] overflow-hidden flex flex-col justify-center bg-[#131315]">
        <div className="relative z-10 max-w-7xl mx-auto w-full editorial-asymmetry">
          <div className="flex flex-col items-start text-left max-w-5xl">
            
            <div className="inline-flex items-center gap-3 mb-12 bg-white/5 px-6 py-2 backdrop-blur-3xl">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C0DF2] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/50">
                CYBER-ATELIER V4.0
              </span>
            </div>

            <h1 className="text-7xl md:text-[9rem] font-bold leading-[0.85] mb-12 font-display italic">
              SEU ESTÚDIO <span className="text-[#7C0DF2]">RevivAI</span> <br />
              <span className="text-white/10">A NOVA MODA</span>
            </h1>

            <p className="text-xl md:text-2xl font-light mb-16 max-w-2xl text-white/40 font-sans">
              Crie ensaios profissionais e campanhas globais em segundos. 
              A RevivAI transforma croquis em editoriais cinematográficos através de algoritmos de alta costura.
            </p>

            <div className="flex flex-wrap justify-center gap-8 items-center">
              <a
                href="/dashboard/studio"
                className="group relative px-12 py-6 rounded-full bg-[#7C0DF2] text-white font-bold text-xs tracking-[0.3em] uppercase hover:bg-white hover:text-[#131313] transition-all duration-700 shadow-[0_0_30px_rgba(124,13,242,0.25)] hover:shadow-[0_0_40px_rgba(255,255,255,0.1)]"
              >
                CRIAR MEU LOOK PREMIUM
              </a>
              
              <a
                href="#demo"
                className="group flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-white/60 hover:text-[#7C0DF2] transition-colors duration-500"
              >
                VER DEMO <ArrowRight size={16} className="text-[#7C0DF2] group-hover:translate-x-3 transition-transform duration-700" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Boutique Metrics */}
      <div className="w-full py-20 bg-[#131315] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {[
              { count: stats.photos,       suffix: '+', label: 'Campaigns' },
              { count: stats.models,       suffix: '',  label: 'AI Models' },
              { count: stats.satisfaction, suffix: '%', label: 'Precision' },
              { count: stats.avgTime,      suffix: 's', label: 'Delivery' },
            ].map(({ count, suffix, label }, i) => (
              <div key={label} className="flex flex-col items-center md:items-start group">
                 <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#7C0DF2]/40 mb-3 group-hover:text-[#7C0DF2] transition-colors">{label}</span>
                <div className="flex items-baseline gap-1">
                   <span className="text-5xl font-bold font-display text-white" data-count={count} data-suffix={suffix}>0</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
