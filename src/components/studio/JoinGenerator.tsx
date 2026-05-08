'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, Film, Link2, Plus, Trash2 } from 'lucide-react'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

function normalizeUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []

  return Array.from(
    new Set(
      raw
        .map((value) => String(value ?? '').trim())
        .filter(Boolean),
    ),
  )
}

function getClipLabel(url: string, index: number) {
  const lastSegment = url.split('/').pop()?.split('?')[0]?.trim()
  return lastSegment && lastSegment.length > 0 ? lastSegment : `clip-${index + 1}.mp4`
}

export default function JoinGenerator({ initial, onGenerate }: Props) {
  const syncKey = JSON.stringify(normalizeUrls(initial.video_urls))

  return <JoinGeneratorBody key={syncKey} initial={initial} onGenerate={onGenerate} />
}

function JoinGeneratorBody({ initial, onGenerate }: Props) {
  const [urls, setUrls] = useState<string[]>(() => normalizeUrls(initial.video_urls))
  const [manualUrl, setManualUrl] = useState('')

  function addManual() {
    const trimmed = manualUrl.trim()
    if (!trimmed) return

    setUrls((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]))
    setManualUrl('')
  }

  function remove(index: number) {
    setUrls((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
  }

  function moveUp(index: number) {
    if (index === 0) return

    setUrls((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  function moveDown(index: number) {
    setUrls((prev) => {
      if (index >= prev.length - 1) return prev

      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  const totalDuration = urls.length * 5
  const canGenerate = urls.length >= 2

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-[22px] border border-rose-500/18 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.18),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))] p-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-rose-500/18 bg-rose-500/10 text-rose-200">
                <Link2 size={18} />
              </div>
              <div className="min-w-0">
                <h4 className="text-[13px] font-semibold tracking-tight text-white">Sequenciador de clipes</h4>
                <p className="mt-1 text-[10px] leading-relaxed text-white/66">
                  Junta varios takes em um unico MP4 final, respeitando a ordem que voce montar no card.
                </p>
              </div>
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2 sm:min-w-[188px]">
            <div className="rounded-[16px] border border-white/8 bg-black/20 px-3 py-2">
              <p className="font-label text-[8px] uppercase tracking-[0.16em] text-white/42">Clipes</p>
              <p className="mt-1 text-[12px] font-semibold text-white">{urls.length}</p>
            </div>
            <div className="rounded-[16px] border border-white/8 bg-black/20 px-3 py-2">
              <p className="font-label text-[8px] uppercase tracking-[0.16em] text-white/42">Duracao</p>
              <p className="mt-1 text-[12px] font-semibold text-white">~{totalDuration}s</p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-rose-500/18 bg-rose-500/10 px-2.5 py-1 font-label text-[9px] uppercase tracking-[0.16em] text-rose-200">
            ffmpeg local
          </span>
          <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 font-label text-[9px] uppercase tracking-[0.16em] text-white/60">
            reencoda para compatibilidade
          </span>
          <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 font-label text-[9px] uppercase tracking-[0.16em] text-white/60">
            ordem manual
          </span>
        </div>
      </div>

      <div className="rounded-[20px] border border-white/8 bg-[#101214] p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <p className="font-label text-[8px] uppercase tracking-[0.16em] text-white/42">Timeline</p>
            <h5 className="mt-1 text-[11px] font-semibold tracking-tight text-white">Ordem final dos segmentos</h5>
          </div>
          <span className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-1 font-label text-[9px] uppercase tracking-[0.16em] text-white/58">
            maximo livre
          </span>
        </div>

        {urls.length === 0 ? (
          <div className="flex min-h-[150px] flex-col items-center justify-center rounded-[18px] border border-dashed border-white/10 bg-black/20 px-5 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] text-white/32">
              <Film size={20} />
            </div>
            <p className="mt-4 font-label text-[10px] uppercase tracking-[0.16em] text-white/42">Nenhum clipe conectado</p>
            <p className="mt-1 max-w-[280px] text-[10px] leading-relaxed text-white/46">
              Arraste videos para os conectores do card ou cole URLs publicas MP4 para montar a sequencia.
            </p>
          </div>
        ) : (
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
            {urls.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="flex flex-col gap-3 rounded-[18px] border border-white/8 bg-black/20 px-3 py-3 transition-colors hover:border-rose-500/24 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] border border-rose-500/18 bg-rose-500/10 text-[10px] font-semibold text-rose-200">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-white">{getClipLabel(url, index)}</p>
                    <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-white/38">
                      segmento {index + 1} • mp4 publico
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 sm:ml-auto sm:flex sm:items-center sm:gap-1">
                  <button
                    type="button"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="flex items-center justify-center rounded-[12px] border border-white/8 bg-white/[0.03] px-3 py-2 text-white/68 transition-colors hover:border-white/14 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label={`Mover clipe ${index + 1} para cima`}
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(index)}
                    disabled={index === urls.length - 1}
                    className="flex items-center justify-center rounded-[12px] border border-white/8 bg-white/[0.03] px-3 py-2 text-white/68 transition-colors hover:border-white/14 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label={`Mover clipe ${index + 1} para baixo`}
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="flex items-center justify-center rounded-[12px] border border-rose-500/10 bg-rose-500/[0.08] px-3 py-2 text-rose-200 transition-colors hover:border-rose-500/24 hover:bg-rose-500/[0.14]"
                    aria-label={`Remover clipe ${index + 1}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[20px] border border-white/8 bg-[#101214] p-3">
        <label className="mb-1.5 block font-label text-[9px] uppercase tracking-[0.16em] text-white/72">
          Adicionar URL manual
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={manualUrl}
            onChange={(event) => setManualUrl(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && addManual()}
            placeholder="https://.../clip.mp4"
            className="min-w-0 flex-1 rounded-[16px] border border-white/8 bg-[#0B0D0F] px-3.5 py-3 text-[12px] text-white outline-none transition-colors placeholder:text-white/24 focus:border-rose-400/30"
          />
          <button
            type="button"
            onClick={addManual}
            disabled={!manualUrl.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-rose-500/16 bg-rose-500/10 px-4 py-3 text-[11px] font-semibold text-rose-200 transition-colors hover:border-rose-400/28 hover:bg-rose-500/[0.14] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Plus size={14} />
            Adicionar
          </button>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-white/46">
          Use isso quando quiser juntar um video externo sem precisar puxar outro card para o canvas.
        </p>
      </div>

      <button
        type="button"
        onClick={() => onGenerate({ video_urls: urls })}
        disabled={!canGenerate}
        className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[18px] bg-gradient-to-r from-rose-600 to-red-500 px-4 py-4 text-[13px] font-semibold text-white shadow-[0_18px_44px_-18px_rgba(244,63,94,0.9)] transition-all hover:from-rose-500 hover:to-red-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
        <Film size={16} className="relative z-10" />
        <span className="relative z-10">{canGenerate ? 'Unir clipes e gerar MP4 master' : 'Conecte pelo menos 2 clipes'}</span>
      </button>

      <p className={`text-center text-[10px] leading-relaxed ${canGenerate ? 'text-white/50' : 'text-white/36'}`}>
        {canGenerate
          ? 'Se os clipes vierem com formatos diferentes, o sistema normaliza tudo antes de costurar.'
          : 'O botao libera quando a timeline tiver ao menos dois segmentos.'}
      </p>
    </div>
  )
}
