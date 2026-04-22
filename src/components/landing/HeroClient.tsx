'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

type Stats = { photos: number; models: number; satisfaction: number; avgTime: number }

const HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD2ZLronBvcQKtJuPLHxfDXquGxJ0B-k_pjOCZpYPyOZwbbV9AOFLOpkjJkSy1HXZ6txKnz_rwgAfZIodfh1_QUbvTWhXfVCRPNCwH_KTJsmFn5pvT6MloB7ATuCiGenBAal-30mbsvQ5QnhsDuBtBbh8LeavsOcYSOSpY51JK75TjZVdsuvbt7Q2NQ78ZKa3O7CDusHBtaa--yBgEYCBGdMCuH7HZwAH6dn-ctfub07aWAE8w9YYVNBUOoppN1SdvVANDnwHB43uMp'

export default function HeroClient({ stats }: { stats: Stats }) {
  useEffect(() => {
    const counters = document.querySelectorAll<HTMLElement>('[data-count]')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const element = entry.target as HTMLElement
          const target = Number(element.dataset.count || 0)
          const suffix = element.dataset.suffix || ''
          let current = 0
          const step = target / 48
          const timer = window.setInterval(() => {
            current = Math.min(current + step, target)
            element.textContent = `${Math.floor(current).toLocaleString('pt-BR')}${suffix}`
            if (current >= target) window.clearInterval(timer)
          }, 18)
          observer.unobserve(element)
        })
      },
      { threshold: 0.4 }
    )

    counters.forEach((counter) => observer.observe(counter))
    return () => observer.disconnect()
  }, [])

  const metricItems = [
    { count: stats.photos, suffix: '+', label: 'Imagens geradas' },
    { count: stats.models, suffix: '+', label: 'Perfis base' },
    { count: stats.avgTime, suffix: 's', label: 'Tempo médio' },
    { count: stats.satisfaction, suffix: '%', label: 'Satisfação' },
  ]

  return (
    <>
      <section className="relative flex min-h-[100dvh] items-center overflow-hidden pt-28">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGE}
            alt="Retrato futurista RevivAI"
            fill
            preload
            quality={68}
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(14,14,14,0.92)_0%,rgba(14,14,14,0.68)_44%,rgba(14,14,14,0.78)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_left_center,rgba(84,214,246,0.16),transparent_28%)]" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col justify-between gap-10 px-6 pb-16 md:px-8 lg:flex-row lg:items-end">
          <div className="max-w-3xl pt-16">
            <p className="font-label mb-5 text-xs text-[#54D6F6]">estúdio visual · IA generativa</p>
            <h1 className="font-display text-6xl font-bold leading-[0.9] tracking-[-0.06em] text-white md:text-[112px]">
              VISUAL DO
              <br />
              <span className="italic text-[#54D6F6]">FUTURO</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-relaxed text-white/62 md:text-lg">
              A nova fronteira da restauração e criação audiovisual. Inteligência artificial clínica para campanhas,
              memória visual e conteúdo premium em escala.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard/studio"
                className="bg-cyan-gradient inline-flex items-center gap-3 rounded-full px-7 py-4 font-label text-xs text-[#003641] shadow-[0_12px_36px_rgba(0,173,204,0.25)] transition-all duration-300 hover:-translate-y-0.5"
              >
                Criar Projeto
              </Link>
              <a
                href="#recursos"
                className="inline-flex items-center gap-3 rounded-full border border-white/10 px-7 py-4 font-label text-xs text-white/70 transition-colors duration-300 hover:border-[#54D6F6]/40 hover:text-white"
              >
                Ver Portfólio
                <ArrowRight size={16} className="text-[#54D6F6]" />
              </a>
            </div>
          </div>

          <div className="flex flex-col items-start gap-4 lg:items-end">
            <div className="h-px w-14 bg-[#00ADCC]" />
            <span className="font-label text-[11px] text-[#54D6F6]">Modo premium ativo</span>
          </div>
        </div>
      </section>

      <section className="tonal-layer-1 border-y border-white/5 py-14">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-10 px-6 md:grid-cols-4 md:px-8">
          {metricItems.map(({ count, suffix, label }) => (
            <div key={label} className="flex flex-col gap-3">
              <span className="font-display text-4xl font-bold text-gradient-cyan md:text-6xl" data-count={count} data-suffix={suffix}>
                0
              </span>
              <span className="font-label text-[11px] text-white/40">{label}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
