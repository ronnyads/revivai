'use client'
import { useEffect, useRef, useState } from 'react'
import BeforeAfterSlider from '@/components/ui/BeforeAfterSlider'

// ─── Substitua pelas URLs reais do Supabase ───────────────────────────────────
// SELECT original_url, restored_url FROM photos WHERE status = 'done' ORDER BY created_at DESC LIMIT 3;
const EXAMPLES = [
  {
    before: 'https://uuulhirkggwraklmegdb.supabase.co/storage/v1/object/public/photos/c4e1b0fa-66a9-41ba-a34b-625480a7d9e3/1775696325720.jpg',
    after:  'https://uuulhirkggwraklmegdb.supabase.co/storage/v1/object/public/photos/c4e1b0fa-66a9-41ba-a34b-625480a7d9e3/1775696341762_restored.jpg',
  },
  {
    before: 'https://uuulhirkggwraklmegdb.supabase.co/storage/v1/object/public/photos/c4e1b0fa-66a9-41ba-a34b-625480a7d9e3/1775695273515.jpg',
    after:  'https://uuulhirkggwraklmegdb.supabase.co/storage/v1/object/public/photos/c4e1b0fa-66a9-41ba-a34b-625480a7d9e3/1775695292203_restored.jpg',
  },
  {
    before: 'https://uuulhirkggwraklmegdb.supabase.co/storage/v1/object/public/photos/c4e1b0fa-66a9-41ba-a34b-625480a7d9e3/1775683275662.jpg',
    after:  'https://uuulhirkggwraklmegdb.supabase.co/storage/v1/object/public/photos/c4e1b0fa-66a9-41ba-a34b-625480a7d9e3/1775683301851_restored.jpg',
  },
]
// ─────────────────────────────────────────────────────────────────────────────

export default function Hero() {
  const [current, setCurrent] = useState(0)
  const [fade, setFade] = useState(true)

  // Auto-rotate every 5s
  useEffect(() => {
    const id = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setCurrent(c => (c + 1) % EXAMPLES.length)
        setFade(true)
      }, 300)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  function goTo(idx: number) {
    if (idx === current) return
    setFade(false)
    setTimeout(() => { setCurrent(idx); setFade(true) }, 300)
  }

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
      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center pt-36 pb-20 px-6">
        <div className="inline-flex items-center gap-2 bg-accent-light border border-accent/30 text-accent rounded-full px-4 py-1.5 text-xs font-medium tracking-widest uppercase mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-[pulseDot_2s_infinite]" />
          IA de restauração — Powered by Replicate
        </div>

        <h1 className="font-display text-[clamp(52px,7vw,100px)] font-normal leading-[1.0] tracking-[-3px] max-w-4xl mb-6">
          Traga o <em className="italic text-accent">passado</em><br />de volta à vida
        </h1>
        <p className="text-lg font-light text-muted max-w-md leading-relaxed mb-12">
          Restaure fotos antigas, danificadas ou desbotadas com inteligência artificial. Resultados profissionais em segundos.
        </p>

        <div className="flex items-center gap-4 mb-16">
          <a href="/dashboard/upload" className="bg-accent text-white text-sm font-medium px-8 py-3.5 rounded border-[1.5px] border-accent hover:bg-accent-dark hover:border-accent-dark transition-all duration-200 shadow-lg shadow-accent/20 hover:-translate-y-0.5">
            Restaurar minha foto →
          </a>
          <a href="#como-funciona" className="text-ink text-sm flex items-center gap-2 hover:gap-3 transition-all duration-200">
            Ver como funciona
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
          </a>
        </div>

        <div className="flex flex-col items-center gap-4 w-full">
          <div className="w-full max-w-sm" style={{ opacity: fade ? 1 : 0, transition: 'opacity 0.3s ease' }}>
            <BeforeAfterSlider before={EXAMPLES[current].before} after={EXAMPLES[current].after} />
          </div>
          {/* Dots */}
          <div className="flex items-center gap-2">
            {EXAMPLES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${i === current ? 'bg-accent w-5' : 'bg-[#E8E8E8] hover:bg-muted'}`}
                aria-label={`Exemplo ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="flex border-t border-b border-[#E8E8E8]">
        {[
          { count: 48000, suffix: '+', label: 'Fotos restauradas' },
          { count: 4,     suffix: '',  label: 'Modelos de IA' },
          { count: 98,    suffix: '%', label: 'Satisfação' },
          { count: 30,    suffix: 's', label: 'Tempo médio' },
        ].map(({ count, suffix, label }) => (
          <div key={label} className="flex-1 text-center py-12 border-r border-[#E8E8E8] last:border-r-0">
            <div className="font-display text-[56px] font-normal tracking-[-2px] leading-none mb-2"
              data-count={count} data-suffix={suffix}>0</div>
            <div className="text-sm text-muted">{label}</div>
          </div>
        ))}
      </div>
    </>
  )
}
