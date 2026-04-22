'use client'

import Link from 'next/link'
import { type ReactNode, useMemo, useState } from 'react'
import { CheckCircle2, Download, ImagePlus, Loader2, LockKeyhole, Search, Sparkles, Wand2 } from 'lucide-react'
import {
  type ClientPromptGalleryTemplate,
} from '@/lib/prompt-gallery'

const INPUT_LABELS = {
  single_image: ['Sua foto'],
  person_and_product: ['Foto da modelo', 'Foto do produto', 'Referencia extra'],
} as const

export default function PromptGalleryContent({ initialTemplates }: { initialTemplates: ClientPromptGalleryTemplate[] }) {
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('Todos')

  const filters = useMemo(
    () => ['Todos', ...Array.from(new Set(initialTemplates.map((item) => item.category))).sort()],
    [initialTemplates],
  )

  const visiblePresets = useMemo(() => {
    return initialTemplates.filter((item) => {
      const matchesFilter = activeFilter === 'Todos' || item.category === activeFilter
      const haystack = `${item.title} ${item.description} ${item.category} ${item.usageLabel}`.toLowerCase()
      const matchesQuery = haystack.includes(query.toLowerCase())
      return matchesFilter && matchesQuery
    })
  }, [activeFilter, initialTemplates, query])

  const totalCards = initialTemplates.length
  const identityLockedCount = initialTemplates.filter((item) => item.identityLock).length
  const maxCreditCost = Math.max(...initialTemplates.map((item) => item.creditCost), 0)

  return (
    <div className="min-h-screen bg-[#050505] px-6 py-10 md:px-10 lg:px-14">
      <div className="mx-auto max-w-7xl">
        <header className="relative overflow-hidden rounded-[34px] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] px-7 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:px-10 md:py-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(84,214,246,0.09),transparent_60%)]" />

          <div className="relative z-10 flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="font-label text-[10px] uppercase tracking-[0.32em] text-[#54D6F6]">
                Archive 01 - Guided Generation
              </p>
              <h1 className="mt-5 font-display text-5xl font-bold leading-[0.9] tracking-[-0.06em] text-white md:text-7xl">
                Galeria de <span className="text-gradient-cyan">Geracoes</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#869397] md:text-xl">
                Escolha o preset, envie sua referencia e entre no Studio com tudo armado. O prompt fica
                protegido por baixo dos panos e voce cobra por foto gerada, nao por texto copiado.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <MetricCard label="presets ativos" value={String(totalCards)} />
              <MetricCard label="identity lock" value={String(identityLockedCount)} />
              <MetricCard label="custo maximo" value={`${maxCreditCost} CR`} accent />
            </div>
          </div>
        </header>

        <section className="mt-8 flex flex-col gap-4">
          <div className="relative max-w-xl">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#869397]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar estilos, nichos ou fluxos guiados..."
              className="w-full rounded-full border border-white/8 bg-white/[0.035] py-3 pl-12 pr-4 text-sm text-white outline-none transition-colors placeholder:text-[#869397]/70 focus:border-[#54D6F6]/35"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {filters.map((filter) => {
              const active = filter === activeFilter
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full px-5 py-2.5 font-label text-[11px] uppercase tracking-[0.2em] transition-all ${
                    active
                      ? 'bg-cyan-gradient text-[#003641]'
                      : 'bg-white/[0.04] text-[#bcc9cd] hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              )
            })}
          </div>
        </section>

        <main className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {visiblePresets.map((template) => (
            <GenerationCard key={template.id} template={template} />
          ))}
        </main>

        {visiblePresets.length === 0 ? (
          <div className="panel-card mt-10 flex min-h-[260px] flex-col items-center justify-center rounded-[34px] border border-white/6 px-6 text-center">
            <Sparkles size={30} className="text-[#54D6F6]" />
            <p className="mt-6 font-display text-3xl font-bold tracking-[-0.04em] text-white">
              Nenhum preset encontrado
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#869397]">
              Ajuste a busca ou troque a categoria para explorar outras direcoes de geracao guiada.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function GenerationCard({ template }: { template: ClientPromptGalleryTemplate }) {
  const labels = INPUT_LABELS[template.inputMode]
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(
    Array.from({ length: Math.max(1, template.requiredImagesCount) }, () => ''),
  )
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [generating, setGenerating] = useState(false)
  const [resultUrl, setResultUrl] = useState('')
  const [generateError, setGenerateError] = useState('')

  async function uploadAt(index: number, file: File) {
    setUploadingIndex(index)

    try {
      const form = new FormData()
      form.append('file', file)

      const response = await fetch('/api/studio/upload', {
        method: 'POST',
        body: form,
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.url) {
        throw new Error(data?.error ?? 'Falha ao enviar a imagem.')
      }

      setUploadedUrls((current) => {
        const next = [...current]
        next[index] = String(data.url)
        return next
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao enviar a imagem.'
      alert(message)
    } finally {
      setUploadingIndex(null)
    }
  }

  async function handleGenerate() {
    const readyUrls = uploadedUrls.filter(Boolean)
    if (readyUrls.length < template.requiredImagesCount) {
      alert(`Envie ${template.requiredImagesCount} imagem(ns) para continuar.`)
      return
    }

    setGenerating(true)
    setGenerateError('')

    try {
      const response = await fetch('/api/prompt-gallery/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          uploadedUrls: readyUrls,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.resultUrl) {
        throw new Error(data?.error ?? 'Nao foi possivel gerar a imagem.')
      }

      setResultUrl(String(data.resultUrl))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel gerar a imagem.'
      setGenerateError(message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-[28px] border border-white/6 bg-[#1C1B1B] transition-all duration-500 hover:-translate-y-1 hover:border-[#54D6F6]/25 hover:shadow-[0_20px_60px_rgba(0,173,204,0.14)]">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#111]">
        <img
          src={template.coverImageUrl}
          alt={template.title}
          className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#1C1B1B] via-[#1C1B1B]/35 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <Badge>{template.category}</Badge>
          <Badge accent>{template.creditCost} CR</Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 font-label text-[9px] uppercase tracking-[0.18em] text-white/58">
            {template.generationMode}
          </span>
          <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 font-label text-[9px] uppercase tracking-[0.18em] text-white/58">
            {template.requiredImagesCount} imagem(ns)
          </span>
          {template.identityLock ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#54D6F6]/18 bg-[#0C171A] px-2.5 py-1 font-label text-[9px] uppercase tracking-[0.18em] text-[#54D6F6]">
              <LockKeyhole size={10} />
              Identity lock
            </span>
          ) : null}
        </div>

        <h3 className="mt-4 font-display text-2xl font-bold tracking-[-0.04em] text-white">
          {template.title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-[#869397]">{template.description}</p>

        <div className="mt-5 rounded-[20px] border border-white/6 bg-black/20 p-4">
          <p className="font-label text-[10px] uppercase tracking-[0.18em] text-white/32">
            Como usar
          </p>
          <p className="mt-3 text-xs leading-relaxed text-[#bcc9cd]">{template.usageLabel}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-white/32">
            O prompt fica oculto e a cena e gerada direto aqui no menu.
          </p>
        </div>

        <div className="mt-5 grid gap-3">
          {Array.from({ length: template.requiredImagesCount }).map((_, index) => {
            const uploaded = uploadedUrls[index]
            const label = labels[index] ?? `Referencia ${index + 1}`
            const busy = uploadingIndex === index

            return (
              <label
                key={`${template.id}-${index}`}
                className="group/upload relative flex cursor-pointer items-center gap-4 rounded-[22px] border border-white/8 bg-white/[0.03] p-3 transition-colors hover:border-[#54D6F6]/25 hover:bg-[#0C171A]"
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={busy || generating}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void uploadAt(index, file)
                  }}
                />

                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[18px] border border-white/8 bg-black/30">
                  {uploaded ? (
                    <img src={uploaded} alt={label} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/28">
                      {busy ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="font-label text-[10px] uppercase tracking-[0.2em] text-[#54D6F6]">{label}</p>
                  <p className="mt-1 text-sm text-white/72">
                    {uploaded ? 'Imagem pronta para gerar.' : busy ? 'Enviando referencia...' : 'Clique para enviar sua referencia.'}
                  </p>
                </div>
              </label>
            )
          })}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={generating || uploadingIndex !== null}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-gradient px-5 py-3 font-display text-sm font-bold tracking-[0.08em] text-[#001f26] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {generating ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
            {generating ? 'Gerando imagem...' : `Gerar imagem - ${template.creditCost} CR`}
          </button>
          <p className="text-center text-[11px] leading-relaxed text-white/28">
            O cliente so envia a foto. A geracao e salva por baixo dos panos.
          </p>
          {generateError ? (
            <p className="rounded-[18px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-xs leading-relaxed text-red-200">
              {generateError}
            </p>
          ) : null}
        </div>

        {resultUrl ? (
          <div className="mt-6 rounded-[24px] border border-[#54D6F6]/18 bg-[#0C171A] p-4">
            <div className="overflow-hidden rounded-[18px] border border-white/8 bg-black/30">
              <img src={resultUrl} alt={`${template.title} gerado`} className="h-full w-full object-contain bg-[#111]" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-[#54D6F6]">
              <CheckCircle2 size={14} />
              <p className="font-label text-[10px] uppercase tracking-[0.2em]">Imagem gerada e salva</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={resultUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-label text-[10px] uppercase tracking-[0.18em] text-white transition-colors hover:border-[#54D6F6]/25 hover:text-[#54D6F6]"
              >
                <Download size={13} />
                Baixar
              </a>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-[#54D6F6]/18 bg-[#101a1d] px-4 py-2 font-label text-[10px] uppercase tracking-[0.18em] text-[#54D6F6] transition-colors hover:bg-[#142126]"
              >
                Ver em minhas fotos
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  )
}

function MetricCard({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-black/18 px-5 py-4">
      <p className="font-label text-[10px] uppercase tracking-[0.24em] text-[#7D8B90]">{label}</p>
      <p className={`mt-3 font-display text-3xl font-bold tracking-[-0.04em] ${accent ? 'text-[#54D6F6]' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}

function Badge({
  children,
  accent = false,
}: {
  children: ReactNode
  accent?: boolean
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 font-label text-[10px] uppercase tracking-[0.2em] ${
        accent
          ? 'border border-[#54D6F6]/18 bg-[#0C171A] text-[#54D6F6]'
          : 'border border-white/8 bg-[#131313]/80 text-white/68 backdrop-blur-md'
      }`}
    >
      {children}
    </span>
  )
}
