'use client'
import { useEffect } from 'react'

export default function Hero() {
  useEffect(() => {
    // Counter animation
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
      {/* Hero Section */}
      <section className="flex flex-col md:flex-row items-center px-6 md:px-20 py-20 md:py-12 gap-10 md:gap-12 pt-28 md:pt-32 min-h-[90vh]" style={{ backgroundColor: '#0e0e0e' }}>
        {/* Text Content */}
        <div className="w-full md:w-1/2 flex flex-col items-start space-y-6 md:space-y-8">
          <div className="inline-flex items-center gap-2 border px-4 py-1.5 text-xs font-medium tracking-widest uppercase mb-2" style={{ borderColor: 'rgba(217,79,46,0.3)', color: '#D94F2E', backgroundColor: 'rgba(217,79,46,0.05)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#D94F2E' }} />
            IA de nova geração
          </div>
          <h1 className="text-6xl md:text-8xl leading-[1.05] tracking-tight" style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', color: '#e5e2e1' }}>
            Traga o passado<br />de volta à{' '}
            <span style={{ color: '#D94F2E' }}>vida</span>
          </h1>
          <p className="max-w-lg text-lg leading-relaxed font-light" style={{ color: 'rgba(229,226,225,0.6)' }}>
            Restaure fotos antigas, danificadas ou desbotadas com inteligência artificial. Resultados profissionais em segundos.
          </p>
          <div className="flex flex-wrap gap-5 pt-2">
            <a
              href="/dashboard/upload"
              className="px-10 py-4 font-bold tracking-tight transition-all active:scale-95"
              style={{ backgroundColor: '#D94F2E', color: '#fff' }}
            >
              Restaurar minha foto →
            </a>
            <a
              href="#como-funciona"
              className="px-10 py-4 font-bold tracking-tight transition-all hover:opacity-80"
              style={{ border: '1px solid rgba(168,138,131,0.4)', color: '#e5e2e1', backgroundColor: 'transparent' }}
            >
              Ver como funciona
            </a>
          </div>
        </div>

        {/* Visual Composition — hidden on mobile */}
        <div className="hidden md:flex w-full md:w-1/2 relative justify-end">
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute -inset-10 rounded-full pointer-events-none" style={{ backgroundColor: '#D94F2E', opacity: 0.08, filter: 'blur(80px)' }} />
            <div className="relative z-10 p-4 shadow-2xl" style={{ backgroundColor: '#1c1b1b', border: '1px solid rgba(89,65,59,0.6)' }}>
              <img
                src="https://uuulhirkggwraklmegdb.supabase.co/storage/v1/object/public/photos/c4e1b0fa-66a9-41ba-a34b-625480a7d9e3/1775740648406_restored.jpg"
                alt="Foto restaurada pela IA"
                className="w-full max-w-lg object-cover"
                style={{ filter: 'brightness(1.05) contrast(1.1)' }}
              />
              <div className="mt-4 flex justify-between items-center" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#a88a83' }}>
                <span>Antes / Depois</span>
                <span>revivai Neural Engine</span>
              </div>
            </div>
            {/* Floating badge */}
            <div className="absolute -bottom-8 -left-8 p-6 hidden lg:block z-20" style={{ backgroundColor: '#2a2a2a', border: '1px solid rgba(89,65,59,0.6)' }}>
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined" style={{ color: '#D94F2E', fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>auto_awesome</span>
                <div>
                  <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a88a83' }}>Satisfação</p>
                  <p className="text-xl font-bold" style={{ color: '#e5e2e1' }}>98%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <div className="w-full bg-white text-black py-10 px-6 md:px-20">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-black/10">
          {[
            { count: 48000, suffix: '+', label: 'Fotos restauradas' },
            { count: 4,     suffix: '',  label: 'Modelos de IA' },
            { count: 98,    suffix: '%', label: 'Satisfação' },
            { count: 30,    suffix: 's', label: 'Tempo médio' },
          ].map(({ count, suffix, label }) => (
            <div key={label} className="flex flex-col items-center py-4 px-4 md:px-8">
              <span
                className="mb-1"
                style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: '2rem', lineHeight: 1 }}
                data-count={count}
                data-suffix={suffix}
              >0</span>
              <span className="text-center" style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.5 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
