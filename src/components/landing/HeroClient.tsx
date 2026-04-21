'use client'
import { useEffect } from 'react'
import { Play, ArrowRight } from 'lucide-react'

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
      <section className="relative px-6 md:px-20 pt-40 pb-20 min-h-[90vh] overflow-hidden flex flex-col justify-center bg-[#131315]">
        {/* Decorative Grid - Neo-Couture style */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.05]" 
          style={{ 
            backgroundImage: 'linear-gradient(#D4FF00 1px, transparent 1px), linear-gradient(90deg, #D4FF00 1px, transparent 1px)',
            backgroundSize: '100px 100px'
          }} 
        />
        
        {/* Large Background Text for Editorial Feel */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none overflow-hidden w-full whitespace-nowrap">
           <span className="text-[25vw] font-bold opacity-[0.02] font-display uppercase tracking-tighter">
             MAGION STUDIO
           </span>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column — 7/12 width */}
            <div className="lg:col-span-8 flex flex-col items-start px-4">
              <div className="inline-flex items-center gap-2 mb-8 bg-[#D4FF00]/10 border border-[#D4FF00]/20 px-3 py-1 rounded-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4FF00]">
                  THE NEO-COUTURE SYNTHESIS
                </span>
              </div>

              <h1 className="text-6xl md:text-[5.5rem] font-bold leading-[0.95] tracking-tighter mb-8 font-display uppercase">
                SEU ESTÚDIO VISUAL <br />
                <span className="text-[#D4FF00]">COM IA PARA MODA</span>
              </h1>

              <p className="text-lg md:text-xl font-light leading-relaxed mb-12 max-w-2xl text-white/50 font-sans">
                Crie campanhas, restaure fotos e gerencie seus projetos com a tecnologia 
                mais avançada de IA. O futuro da imagem está aqui.
              </p>

              <div className="flex flex-wrap gap-6 items-center">
                <a
                  href="/dashboard/studio"
                  className="group relative px-10 py-5 bg-[#D4FF00] text-[#131315] font-bold text-sm tracking-widest uppercase hover:bg-white transition-all duration-500 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    ABRIR O STUDIO <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </a>
                
                <a
                  href="#como-funciona"
                  className="px-10 py-5 border border-white/10 text-white font-bold text-sm tracking-widest uppercase hover:bg-white/5 transition-all duration-300"
                >
                  VER RECURSOS
                </a>
              </div>
            </div>

            {/* Right Column — 4/12 width */}
            <div className="lg:col-span-4 hidden lg:flex justify-end">
              <div className="relative group">
                {/* Visual Accent - Neon Box */}
                <div className="absolute -inset-4 border border-[#D4FF00]/30 group-hover:inset-0 transition-all duration-700" />
                
                <div 
                  className="relative w-80 aspect-[3/4] bg-[#201f22] overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000"
                  style={{ border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-[#131315] to-transparent opacity-60" />
                  
                  {/* Studio Interface Placeholder */}
                  <div className="absolute bottom-8 left-8 right-8 space-y-4">
                    <div className="h-1 w-20 bg-[#D4FF00]" />
                    <p className="text-xs font-bold tracking-widest uppercase text-white">AD STUDIO V3.0</p>
                    <div className="flex items-center gap-2 text-[10px] text-white/40 tracking-widest uppercase">
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      REAL-TIME RENDERING
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Stats Section — Boutique Style */}
      <div className="w-full py-16 bg-[#131315] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { count: stats.photos,       suffix: '+', label: 'Restaurações' },
              { count: stats.models,       suffix: '',  label: 'Modelos IA' },
              { count: stats.satisfaction, suffix: '%', label: 'Satisfação' },
              { count: stats.avgTime,      suffix: 's', label: 'Tempo Médio' },
            ].map(({ count, suffix, label }, i) => (
              <div
                key={label}
                className="flex flex-col items-center md:items-start"
              >
                <div className="flex items-baseline gap-1 mb-2">
                   <span className="text-4xl md:text-5xl font-bold font-display" data-count={count} data-suffix={suffix}>0</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4FF00]/60">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
