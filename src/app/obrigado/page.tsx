'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, Suspense } from 'react'
import { Check, Copy, CheckCheck, ImageIcon, Video, Sparkles } from 'lucide-react'
import Link from 'next/link'

// ── Plan config ────────────────────────────────────────────────────────────────

const PLAN_META: Record<string, {
  name: string
  credits: number
  gradient: string
  ring: string
  badge: string
}> = {
  starter: {
    name: 'Rookie',
    credits: 600,
    gradient: 'from-zinc-700 via-slate-600 to-zinc-700',
    ring: 'ring-zinc-500',
    badge: 'bg-zinc-800 text-zinc-300',
  },
  popular: {
    name: 'Creator',
    credits: 1100,
    gradient: 'from-blue-700 via-indigo-600 to-blue-700',
    ring: 'ring-blue-500',
    badge: 'bg-blue-900/60 text-blue-300',
  },
  pro: {
    name: 'Pro',
    credits: 2100,
    gradient: 'from-purple-700 via-violet-600 to-purple-700',
    ring: 'ring-purple-500',
    badge: 'bg-purple-900/60 text-purple-300',
  },
  agency: {
    name: 'Studio',
    credits: 5100,
    gradient: 'from-amber-600 via-orange-500 to-amber-600',
    ring: 'ring-amber-400',
    badge: 'bg-amber-900/60 text-amber-300',
  },
}

// ── Confetti pieces (fixed seeds to avoid hydration mismatch) ─────────────────

const CONFETTI = [
  { left: 7,  delay: 0,    dur: 2.8, color: '#3b82f6', size: 8,  rot: 35 },
  { left: 14, delay: 0.3,  dur: 2.2, color: '#a855f7', size: 6,  rot: -20 },
  { left: 21, delay: 0.1,  dur: 3.1, color: '#f59e0b', size: 10, rot: 60 },
  { left: 28, delay: 0.5,  dur: 2.5, color: '#10b981', size: 7,  rot: -45 },
  { left: 35, delay: 0.2,  dur: 2.9, color: '#ef4444', size: 9,  rot: 15 },
  { left: 42, delay: 0.7,  dur: 2.3, color: '#3b82f6', size: 6,  rot: 80 },
  { left: 49, delay: 0.4,  dur: 3.0, color: '#a855f7', size: 8,  rot: -30 },
  { left: 56, delay: 0.1,  dur: 2.6, color: '#f59e0b', size: 5,  rot: 50 },
  { left: 63, delay: 0.6,  dur: 2.4, color: '#10b981', size: 11, rot: -10 },
  { left: 70, delay: 0.3,  dur: 2.8, color: '#ef4444', size: 7,  rot: 40 },
  { left: 77, delay: 0.8,  dur: 2.2, color: '#3b82f6', size: 6,  rot: -55 },
  { left: 84, delay: 0.2,  dur: 3.2, color: '#a855f7', size: 9,  rot: 25 },
  { left: 91, delay: 0.5,  dur: 2.7, color: '#f59e0b', size: 8,  rot: -70 },
  { left: 10, delay: 0.9,  dur: 2.1, color: '#10b981', size: 5,  rot: 65 },
  { left: 18, delay: 0.4,  dur: 3.3, color: '#ef4444', size: 10, rot: -15 },
  { left: 31, delay: 0.6,  dur: 2.5, color: '#3b82f6', size: 7,  rot: 45 },
  { left: 44, delay: 0.1,  dur: 2.9, color: '#a855f7', size: 6,  rot: -40 },
  { left: 58, delay: 0.8,  dur: 2.3, color: '#f59e0b', size: 9,  rot: 20 },
  { left: 72, delay: 0.3,  dur: 3.1, color: '#10b981', size: 8,  rot: -60 },
  { left: 86, delay: 0.7,  dur: 2.6, color: '#ef4444', size: 5,  rot: 30 },
  { left: 5,  delay: 1.0,  dur: 2.4, color: '#a855f7', size: 7,  rot: -25 },
  { left: 25, delay: 0.5,  dur: 2.8, color: '#3b82f6', size: 10, rot: 55 },
  { left: 38, delay: 0.2,  dur: 3.0, color: '#f59e0b', size: 6,  rot: -50 },
  { left: 52, delay: 0.9,  dur: 2.2, color: '#10b981', size: 8,  rot: 10 },
  { left: 66, delay: 0.4,  dur: 2.7, color: '#ef4444', size: 9,  rot: -35 },
  { left: 79, delay: 0.1,  dur: 3.2, color: '#a855f7', size: 5,  rot: 70 },
  { left: 93, delay: 0.6,  dur: 2.5, color: '#3b82f6', size: 7,  rot: -20 },
  { left: 47, delay: 0.3,  dur: 2.9, color: '#f59e0b', size: 11, rot: 40 },
  { left: 60, delay: 0.8,  dur: 2.3, color: '#10b981', size: 6,  rot: -65 },
  { left: 74, delay: 0.2,  dur: 3.1, color: '#ef4444', size: 8,  rot: 15 },
]

// ── Credit counter hook ────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1500) {
  const [value, setValue] = useState(0)
  const raf = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(ease * target))
      if (progress < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])

  return value
}

// ── Main client component ──────────────────────────────────────────────────────

function ThankYouClient() {
  const params = useSearchParams()
  const planKey = params.get('plan') ?? 'popular'
  const meta = PLAN_META[planKey] ?? PLAN_META['popular']
  const credits = Number(params.get('credits') ?? meta.credits)

  const count = useCountUp(credits)
  const [copied, setCopied] = useState(false)

  const shareText = `Acabei de assinar o plano ${meta.name} da reviv.ai e já tenho ${credits.toLocaleString('pt-BR')} créditos para criar imagens e vídeos com IA! 🚀 reviv.ai`

  function handleCopy() {
    navigator.clipboard.writeText(shareText).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`

  return (
    <>
      {/* ── Confetti ── */}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-120px) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(var(--rot)); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .confetti-piece { display: none; }
        }
      `}</style>

      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        {CONFETTI.map((c, i) => (
          <div
            key={i}
            className="confetti-piece absolute rounded-sm"
            style={{
              left: `${c.left}%`,
              top: 0,
              width: c.size,
              height: c.size * 0.55,
              backgroundColor: c.color,
              '--rot': `${c.rot}deg`,
              animationName: 'confetti-fall',
              animationDuration: `${c.dur}s`,
              animationDelay: `${c.delay}s`,
              animationTimingFunction: 'ease-in',
              animationFillMode: 'both',
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* ── Page ── */}
      <main className="relative z-10 min-h-dvh bg-zinc-950 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">

          {/* Plan badge */}
          <span className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full ring-1 ${meta.badge} ${meta.ring}`}>
            <Sparkles size={11} />
            Plano {meta.name}
          </span>

          {/* Headline */}
          <div>
            <p className="text-4xl font-bold text-white">Compra confirmada!</p>
            <p className="mt-2 text-zinc-400 text-sm leading-relaxed">
              Suas credenciais chegam por e-mail em instantes.<br />
              Faça login e comece a criar agora.
            </p>
          </div>

          {/* Credits counter */}
          <div className={`w-full rounded-2xl bg-gradient-to-br ${meta.gradient} p-px`}>
            <div className="rounded-2xl bg-zinc-950 px-6 py-8">
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Seus créditos</p>
              <p className="text-5xl font-black text-white tabular-nums">
                {count.toLocaleString('pt-BR')}
              </p>
              <p className="text-zinc-500 text-xs mt-1">créditos disponíveis</p>
            </div>
          </div>

          {/* Unlocks grid */}
          <div className="w-full grid grid-cols-3 gap-3">
            {[
              { icon: <ImageIcon size={16} />, label: 'Imagens', value: Math.floor(credits / 8) },
              { icon: <Video size={16} />, label: 'Vídeos', value: Math.floor(credits / 15) },
              { icon: <Sparkles size={16} />, label: 'Upscales 4K', value: Math.floor(credits / 3) },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl py-4 px-2">
                <span className="text-zinc-500">{icon}</span>
                <p className="text-xl font-bold text-white">{value.toLocaleString('pt-BR')}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link
            href="/login"
            className="w-full py-3.5 rounded-xl bg-white text-zinc-900 font-bold text-sm hover:bg-zinc-100 transition-colors text-center"
          >
            Acessar minha conta →
          </Link>

          {/* Social share */}
          <div className="w-full flex gap-2">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-xs text-zinc-300 font-medium transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-green-400">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              Compartilhar
            </a>

            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-xs text-zinc-300 font-medium transition-colors"
            >
              {copied
                ? <><CheckCheck size={13} className="text-blue-400" /> Copiado!</>
                : <><Copy size={13} /> Copiar texto</>
              }
            </button>
          </div>

          <p className="text-zinc-600 text-xs">
            Dúvidas? Fale conosco pelo{' '}
            <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white underline underline-offset-2 transition-colors">
              WhatsApp
            </a>
          </p>
        </div>
      </main>
    </>
  )
}

// ── Page export (Server) ───────────────────────────────────────────────────────

export default function ObrigadoPage() {
  return (
    <Suspense>
      <ThankYouClient />
    </Suspense>
  )
}
