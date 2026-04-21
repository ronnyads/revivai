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
      <section className="relative px-6 md:px-20 pt-40 pb-20 min-h-[95vh] overflow-hidden flex flex-col justify-center bg-[#131315]">
        {/* Editorial Grid Background */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.02]" 
          style={{ 
            backgroundImage: 'linear-gradient(#D94F2E 1px, transparent 1px), linear-gradient(90deg, #D94F2E 1px, transparent 1px)',
            backgroundSize: '120px 120px'
          }} 
        />
        
        {/* Foreground Large Text */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none w-full text-center">
           <span className="text-[22vw] font-bold opacity-[0.015] font-display uppercase tracking-[-0.05em] leading-none">
             ESTHETIQUE
           </span>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
            
            <div className="inline-flex items-center gap-3 mb-10 bg-white/5 border border-white/10 px-4 py-1.5 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D94F2E] animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-white/60">
                PROXIMA GERAÇÃO: CINEMA CORE V3
              </span>
            </div>

            <h1 className="text-6xl md:text-[7rem] font-bold leading-[0.9] tracking-tighter mb-10 font-display uppercase italic">
              SEU ESTÚDIO <span className="text-[#D94F2E]">CINEMATOGRÁFICO</span> <br />
              <span className="text-white/20">DO SEU JEITO</span>
            </h1>

            <p className="text-lg md:text-2xl font-light leading-relaxed mb-14 max-w-3xl text-white/50 font-sans">
              Crie ensaios profissionais, lookbooks de alta costura e campanhas globais em segundos. 
              A RevivAI transforma croquis e fotos simples em editoriais cinematográficos.
            </p>

            <div className="flex flex-wrap justify-center gap-8 items-center">
              <a
                href="/dashboard/studio"
                className="group relative px-12 py-6 rounded-full bg-[#D94F2E] text-white font-bold text-xs tracking-[0.3em] uppercase hover:bg-white hover:text-[#131313] transition-all duration-700 shadow-[0_0_30px_rgba(217,79,46,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.1)]"
              >
                CRIAR MEU PRIMEIRO LOOK
              </a>
              
              <a
                href="#demo"
                className="group flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-white/60 hover:text-[#D4FF00] transition-colors duration-500"
              >
                VER DEMO <ArrowRight size={16} className="text-[#D4FF00] group-hover:translate-x-3 transition-transform duration-700" />
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
                 <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#D94F2E]/40 mb-3 group-hover:text-[#D94F2E] transition-colors">{label}</span>
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
