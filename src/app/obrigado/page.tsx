'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCheck, Copy, ImageIcon, Sparkles, Video } from 'lucide-react'
import { fbq } from '@/components/MetaPixel'

const PLAN_META: Record<
  string,
  {
    name: string
    credits: number
    accent: string
    glow: string
    badge: string
  }
> = {
  free: {
    name: 'Explorador',
    credits: 50,
    accent: '#5eead4',
    glow: 'rgba(94,234,212,0.18)',
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20',
  },
  starter: {
    name: 'Rookie',
    credits: 600,
    accent: '#54d6f6',
    glow: 'rgba(84,214,246,0.18)',
    badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-400/20',
  },
  popular: {
    name: 'Creator',
    credits: 1200,
    accent: '#54d6f6',
    glow: 'rgba(84,214,246,0.2)',
    badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-400/20',
  },
  pro: {
    name: 'Pro',
    credits: 3000,
    accent: '#7dd3fc',
    glow: 'rgba(125,211,252,0.18)',
    badge: 'bg-sky-500/10 text-sky-300 border-sky-400/20',
  },
  agency: {
    name: 'Studio',
    credits: 8000,
    accent: '#f6c454',
    glow: 'rgba(246,196,84,0.18)',
    badge: 'bg-amber-500/10 text-amber-300 border-amber-400/20',
  },
}

const HERO_VISUAL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAiHNEg_dN122MEuwMZGwxwMRklFhYxP44S1vRp9qFfS2doGUJjEskPqAC98xZ7ICMCG8KSYxNMA_yOfh7B-QtzQMBC0j2cYz-RH4xcXoAcM9oWVOUTqFh12z-QiHoLf3CHBAvVFcnQ81VPxmAZyQ8vBLnoBqN3XdjRZCgYWyfKwr_IaGmOXjn8Q-Qb4-0fIliCy7ZIP7BYwTS7DTPP_RecgXjkFmysQBnw696fWCTqIOhh5fQYs821GsN7KKvaW8heG7YKgX-CDeSm'

function useCountUp(target: number, duration = 1500) {
  const [value, setValue] = useState(0)
  const raf = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) raf.current = requestAnimationFrame(tick)
    }

    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])

  return value
}

function ThankYouClient() {
  const params = useSearchParams()
  const planKey = params.get('plan') ?? 'popular'
  const meta = PLAN_META[planKey] ?? PLAN_META.popular
  const credits = Number(params.get('credits') ?? meta.credits)
  const animatedCredits = useCountUp(credits)
  const [copied, setCopied] = useState(false)

  const shareText = `Acabei de assinar o plano ${meta.name} da RevivAI e ja tenho ${credits.toLocaleString('pt-BR')} creditos para criar imagens e videos com IA premium. https://revivads.com`
  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`

  const stats = [
    { label: 'POTENCIAL DE GERACAO', value: Math.max(1, Math.floor(credits / 8)), unit: 'IMAGENS', icon: ImageIcon },
    { label: 'CINEMATICS', value: Math.max(1, Math.floor(credits / 15)), unit: 'VIDEOS', icon: Video },
    { label: 'MASTERIZACAO', value: Math.max(1, Math.floor(credits / 3)), unit: 'UPSCALES 4K', icon: Sparkles },
  ]

  function handleCopy() {
    navigator.clipboard.writeText(shareText).catch(() => {})
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2200)
  }

  useEffect(() => {
    const rawId =
      params.get('sale_id') ??
      params.get('transaction_id') ??
      params.get('order_id') ??
      params.get('payment_id') ??
      params.get('purchase_id')

    if (!rawId) return

    const eventId = `purchase:${rawId}:${planKey}`
    const storageKey = `meta_purchase_sent:${eventId}`

    try {
      if (window.sessionStorage.getItem(storageKey)) return
      window.sessionStorage.setItem(storageKey, '1')
    } catch {}

    fbq(
      'track',
      'Purchase',
      {
        value: Number(params.get('value') ?? params.get('amount') ?? 0) || undefined,
        currency: params.get('currency') ?? 'BRL',
        content_ids: [planKey],
        content_type: 'product',
      },
      { eventID: eventId }
    )
  }, [params, planKey])

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0e0e0e] text-[#e5e2e1]">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at center, ${meta.glow} 0%, transparent 62%)`,
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%,transparent_82%,rgba(255,255,255,0.02))]" />
      </div>

      <header className="relative z-20 border-b border-white/6 bg-[#131313]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-5">
          <Link href="/" className="font-display text-2xl font-bold tracking-[-0.08em] text-[#54d6f6]">
            REVIVAI
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <span className="font-label text-[10px] tracking-[0.24em] text-[#869397]">COMPRA CONFIRMADA</span>
            <span className="rounded-full border border-white/8 bg-white/3 px-3 py-1.5 font-label text-[10px] tracking-[0.2em] text-[#54d6f6]">
              PLANO {meta.name.toUpperCase()}
            </span>
          </div>
          <Link
            href="/auth/login"
            className="rounded-full border border-[#54d6f6]/25 bg-[#54d6f6]/10 px-4 py-2 font-label text-[10px] tracking-[0.2em] text-[#54d6f6] transition-colors hover:bg-[#54d6f6]/16"
          >
            ACESSAR CONTA
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col px-6 pb-24 pt-14">
        <div className="mx-auto max-w-3xl text-center">
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-white/8 bg-white/3 shadow-[0_0_40px_rgba(84,214,246,0.12)]"
            style={{ boxShadow: `0 0 40px ${meta.glow}` }}
          >
            <CheckCheck size={36} color={meta.accent} />
          </div>

          <p className="mt-8 font-label text-[10px] tracking-[0.28em] text-[#54d6f6]">SINAL VERDE LIBERADO</p>
          <h1 className="mt-5 font-display text-5xl font-bold tracking-[-0.07em] text-white sm:text-7xl">
            COMPRA CONFIRMADA!
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[#869397] sm:text-lg">
            Suas credenciais chegam por e-mail em instantes. O plano ja esta habilitado para voce
            entrar no studio e comecar a produzir com acabamento premium.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-12">
          <section className="panel-card md:col-span-8 rounded-[2rem] p-7 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <span className={`inline-flex rounded-full border px-3 py-1.5 ${meta.badge}`}>
                  <span className="font-label text-[10px] tracking-[0.2em]">PLANO {meta.name.toUpperCase()}</span>
                </span>
                <p className="mt-6 font-label text-[10px] tracking-[0.24em] text-[#54d6f6]">SEUS CREDITOS</p>
                <div className="mt-3 flex items-end gap-3">
                  <span className="font-display text-6xl font-bold tracking-[-0.08em] text-white sm:text-8xl">
                    {animatedCredits.toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="mt-2 font-label text-[10px] tracking-[0.22em] text-[#869397]">
                  CREDITOS DISPONIVEIS
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-white/6 bg-white/[0.025] px-4 py-3">
                <p className="font-label text-[10px] tracking-[0.22em] text-[#869397]">SISTEMA OPERANTE</p>
                <p className="mt-2 font-display text-lg font-bold tracking-[-0.05em] text-white">
                  REVIVAI PRECISION
                </p>
              </div>
            </div>

            <div className="relative mt-10 overflow-hidden rounded-[1.5rem] border border-white/6">
              <img
                src={HERO_VISUAL}
                alt="Visual abstrato premium da RevivAI"
                className="h-40 w-full object-cover opacity-60 grayscale transition duration-700 hover:opacity-85 hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(14,14,14,0.78))]" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-4">
                <p className="font-label text-[10px] tracking-[0.22em] text-[#e5e2e1]/75">
                  STACK PREMIUM LIBERADO
                </p>
                <p className="font-label text-[10px] tracking-[0.22em] text-[#54d6f6]">CHECKOUT VALIDADO</p>
              </div>
            </div>
          </section>

          <aside className="md:col-span-4 flex flex-col gap-6">
            {stats.map(({ label, value, unit, icon: Icon }) => (
              <div
                key={label}
                className="rounded-[1.6rem] border border-white/6 bg-white/[0.035] p-6 transition-colors hover:bg-white/[0.055]"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="font-label text-[10px] tracking-[0.22em] text-[#869397]">{label}</span>
                  <Icon size={16} color={meta.accent} />
                </div>
                <div className="mt-5 flex items-end gap-2">
                  <span className="font-display text-4xl font-bold tracking-[-0.06em] text-white">
                    {value.toLocaleString('pt-BR')}
                  </span>
                  <span className="pb-1 font-label text-[10px] tracking-[0.18em] text-[#869397]">{unit}</span>
                </div>
              </div>
            ))}
          </aside>
        </div>

        <div className="mt-12 flex flex-col items-stretch justify-center gap-4 md:flex-row">
          <Link
            href="/auth/login"
            className="inline-flex min-h-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00adcc,#54d6f6)] px-8 text-sm font-bold tracking-[0.16em] text-[#001f26] transition-all hover:scale-[1.01] hover:shadow-[0_18px_45px_rgba(84,214,246,0.25)]"
          >
            ACESSAR MINHA CONTA →
          </Link>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-8 text-sm font-medium text-white transition-colors hover:border-[#54d6f6]/30 hover:bg-[#54d6f6]/8"
          >
            COMPARTILHAR
          </a>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-8 text-sm font-medium text-white transition-colors hover:border-[#54d6f6]/30 hover:bg-[#54d6f6]/8"
          >
            <Copy size={14} />
            {copied ? 'COPIADO!' : 'COPIAR TEXTO'}
          </button>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-6 border-t border-white/6 pt-8 text-center md:flex-row md:text-left">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[#54d6f6] shadow-[0_0_14px_rgba(84,214,246,0.95)]" />
            <span className="font-label text-[10px] tracking-[0.24em] text-[#869397]">
              SISTEMA OPERANTE: REVIVAI PRECISION
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link href="/termos" className="font-label text-[10px] tracking-[0.2em] text-[#869397] transition-colors hover:text-white">
              TERMOS DE USO
            </Link>
            <a
              href="https://wa.me/5511969656723"
              target="_blank"
              rel="noopener noreferrer"
              className="font-label text-[10px] tracking-[0.2em] text-[#869397] transition-colors hover:text-white"
            >
              SUPORTE TECNICO
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}

export default function ObrigadoPage() {
  return (
    <Suspense>
      <ThankYouClient />
    </Suspense>
  )
}
