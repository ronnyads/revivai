'use client'
import { useEffect } from 'react'
import { Play } from 'lucide-react'

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
      {/* ── Hero ── */}
      <section
        className="relative px-6 md:px-20 pt-32 pb-0 min-h-[100vh] overflow-hidden"
        style={{ backgroundColor: '#020209' }}
      >
        {/* Animated dot grid */}
        <div
          className="absolute inset-0 pointer-events-none animate-grid-pulse"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(45,126,255,0.55) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Radial glows */}
        <div className="absolute pointer-events-none" style={{ top: '10%', left: '5%', width: 500, height: 500, borderRadius: 9999, backgroundColor: 'rgba(45,126,255,0.07)', filter: 'blur(130px)' }} />
        <div className="absolute pointer-events-none" style={{ bottom: '20%', right: '5%', width: 400, height: 400, borderRadius: 9999, backgroundColor: 'rgba(45,126,255,0.05)', filter: 'blur(110px)' }} />

        {/* Split layout */}
        <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center min-h-[85vh]">

          {/* Left — Text */}
          <div className="flex flex-col items-start">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium tracking-widest uppercase mb-7"
              style={{ border: '1px solid rgba(45,126,255,0.3)', color: '#7AAAFF', backgroundColor: 'rgba(45,126,255,0.06)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#2D7EFF' }} />
              Studio UGC com IA
            </div>

            {/* Headline */}
            <h1
              className="text-5xl md:text-7xl leading-[1.05] tracking-tight mb-6"
              style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', color: '#E8ECFF' }}
            >
              Imite movimentos.<br />
              Crie conteúdo que<br />
              <span style={{ color: '#2D7EFF' }}>vende de verdade.</span>
            </h1>

            {/* Subtitle */}
            <p
              className="text-base md:text-lg leading-relaxed font-light mb-10 max-w-lg"
              style={{ color: 'rgba(232,236,255,0.5)' }}
            >
              Faça qualquer foto falar, dançar e se mover com IA.
              Gere vídeos, vozes e anúncios — tudo no Studio.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 mb-10">
              <a
                href="/dashboard/studio"
                className="px-8 py-4 text-sm font-semibold tracking-tight transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: '#2D7EFF', color: '#fff', borderRadius: 4 }}
              >
                Abrir o Studio →
              </a>
              <a
                href="#como-funciona"
                className="px-8 py-4 text-sm font-semibold tracking-tight transition-all hover:opacity-80"
                style={{ border: '1px solid rgba(45,126,255,0.35)', color: '#E8ECFF', backgroundColor: 'transparent', borderRadius: 4 }}
              >
                Ver como funciona
              </a>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {['Animate', 'Lipsync', 'Vídeo IA', 'Voz Clonada', 'Upscale 4K'].map(tag => (
                <span
                  key={tag}
                  className="text-[11px] px-3 py-1 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(45,126,255,0.15)', color: 'rgba(232,236,255,0.45)' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Right — Reels video placeholder */}
          <div className="flex justify-center md:justify-end">
            <div
              className="animate-float-y relative rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-4"
              style={{
                aspectRatio: '9/16',
                width: '100%',
                maxWidth: 300,
                backgroundColor: 'rgba(45,126,255,0.04)',
                border: '1px solid rgba(45,126,255,0.2)',
              }}
            >
              {/* Glow behind */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(45,126,255,0.12) 0%, transparent 70%)' }} />

              <div
                className="relative w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(45,126,255,0.15)', border: '1px solid rgba(45,126,255,0.3)' }}
              >
                <Play size={24} style={{ color: '#2D7EFF', marginLeft: 3 }} />
              </div>
              <div className="relative text-center px-6">
                <p className="text-sm font-semibold mb-1" style={{ color: '#E8ECFF' }}>Imitar Movimentos</p>
                <p className="text-xs" style={{ color: 'rgba(232,236,255,0.35)' }}>Vídeo demo em breve</p>
              </div>
              {/* Reels label */}
              <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{ backgroundColor: 'rgba(45,126,255,0.1)', border: '1px solid rgba(45,126,255,0.2)' }}
              >
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: '#2D7EFF' }} />
                <span className="text-[10px] font-medium" style={{ color: '#7AAAFF' }}>9:16 · Reels</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Stats Bar ── */}
      <div className="w-full py-10 px-6 md:px-20" style={{ backgroundColor: '#06070F', borderTop: '1px solid rgba(45,126,255,0.08)' }}>
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4">
          {[
            { count: stats.photos,       suffix: '+', label: 'Fotos restauradas' },
            { count: stats.models,       suffix: '',  label: 'Modelos de IA' },
            { count: stats.satisfaction, suffix: '%', label: 'Satisfação' },
            { count: stats.avgTime,      suffix: 's', label: 'Tempo médio' },
          ].map(({ count, suffix, label }, i) => (
            <div
              key={label}
              className="flex flex-col items-center py-4 px-4 md:px-8"
              style={{ borderLeft: i > 0 ? '1px solid rgba(45,126,255,0.1)' : 'none' }}
            >
              <span
                className="mb-1"
                style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: '2rem', lineHeight: 1, color: '#E8ECFF' }}
                data-count={count}
                data-suffix={suffix}
              >0</span>
              <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(232,236,255,0.35)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
