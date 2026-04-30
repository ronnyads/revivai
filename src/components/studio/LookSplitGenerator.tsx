'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Layers, Loader2, Scissors, ShieldCheck, Sparkles } from 'lucide-react'
import ImageUpload from './ImageUpload'
import { CREDIT_COST } from '@/constants/studio'

type SplitReference = {
  category?: string
  url?: string
  rank?: number
  zone?: string
}

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

function normalizeSplitReferences(value: unknown): SplitReference[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is SplitReference => !!item && typeof item === 'object')
    .filter((item) => typeof item.url === 'string' && item.url.trim().length > 0)
}

function formatCategory(category?: string) {
  switch (category) {
    case 'outerwear':
      return 'Outerwear'
    case 'one-pieces':
      return 'Look inteiro'
    case 'bottoms':
      return 'Parte de baixo'
    case 'headwear':
      return 'Cabeca'
    case 'bags':
      return 'Bolsa'
    case 'glasses':
      return 'Oculos'
    case 'jewelry':
      return 'Acessorio'
    case 'shoes':
      return 'Calcado'
    case 'tops':
      return 'Parte de cima'
    default:
      return 'Referencia'
  }
}

export default function LookSplitGenerator({ initial, onGenerate }: Props) {
  const initialSourceUrl = typeof initial.source_url === 'string' ? initial.source_url : ''
  const initialSmartPrompt = typeof initial.smart_prompt === 'string' ? initial.smart_prompt : ''
  const [sourceUrl, setSourceUrl] = useState(initialSourceUrl)
  const [smartPrompt, setSmartPrompt] = useState(initialSmartPrompt)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setSourceUrl(initialSourceUrl)
  }, [initialSourceUrl])

  useEffect(() => {
    setSmartPrompt(initialSmartPrompt)
  }, [initialSmartPrompt])

  const splitReferences = useMemo(
    () => normalizeSplitReferences(initial.split_references),
    [initial.split_references],
  )
  const hasSource = sourceUrl.trim().length > 0

  async function handleGenerate() {
    if (!hasSource) return
    setLoading(true)
    try {
      onGenerate({
        source_url: sourceUrl.trim(),
        smart_prompt: smartPrompt.trim(),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-cyan-500/12 bg-cyan-500/5 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-cyan-400/20 bg-[#0D171B] p-2">
            <Scissors size={14} className="text-[#8EDDED]" />
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-tight text-white">Separar Look</p>
            <p className="text-[10px] leading-relaxed text-white/56">
              Nao cria nada novo. So divide o look enviado em ate 3 referencias fieis para conectar no Provador.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[200px_minmax(0,1fr)]">
        <div className={`space-y-2 rounded-2xl border ${hasSource ? 'border-cyan-500/18 bg-cyan-500/6' : 'border-white/8 bg-white/[0.03]'} p-2`}>
          <div className="flex items-center gap-1 px-1">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/44">Foto fonte</span>
            <ShieldCheck size={10} className="text-emerald-400" />
          </div>
          <ImageUpload value={sourceUrl} onChange={setSourceUrl} label="Look / catalogo" accept="image/*" />
        </div>

        <div className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
          <div className="rounded-2xl border border-emerald-500/14 bg-emerald-500/8 px-3 py-2">
            <div className="flex items-center gap-2">
              <Layers size={13} className="text-emerald-300" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">Saida pensada para o Provador</p>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-white/58">
              A referencia principal vira `product_url` e todas as referencias validas viram `product_urls` quando voce conectar este card no Provador.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block px-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white/44">
              Observacao opcional
            </label>
            <textarea
              value={smartPrompt}
              onChange={(event) => setSmartPrompt(event.target.value)}
              rows={3}
              placeholder="Ex: priorizar casaco + calca + bolsa. Nao use para pedir criacao nova."
              className="w-full rounded-2xl border border-white/8 bg-[#0B0E10] px-3 py-2 text-[12px] text-white/72 outline-none transition-colors placeholder:text-white/24 focus:border-cyan-500/26"
            />
          </div>

          <div className="flex items-start gap-2 rounded-2xl border border-amber-500/14 bg-amber-500/8 px-3 py-2">
            <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-300" />
            <p className="text-[11px] leading-relaxed text-white/58">
              O motor deste card nao estiliza nem inventa pecas. Ele apenas recorta, limpa e organiza o que realmente aparece na foto enviada.
            </p>
          </div>

          {splitReferences.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Sparkles size={12} className="text-cyan-300" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                  Referencias atuais
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {splitReferences.slice(0, 3).map((reference, index) => (
                  <div key={`${reference.url}-${index}`} className="overflow-hidden rounded-[18px] border border-white/8 bg-black/20">
                    <div className="aspect-[4/5] overflow-hidden">
                      <img src={reference.url} alt={`Referencia ${index + 1}`} className="h-full w-full object-contain" />
                    </div>
                    <div className="border-t border-white/8 px-2 py-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${index === 0 ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200' : 'border-white/10 bg-white/[0.05] text-white/58'}`}>
                        {index === 0 ? 'Principal' : `Ref ${index + 1}`}
                      </span>
                      <p className="mt-1 truncate text-[10px] text-white/52">{formatCategory(reference.category)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!hasSource || loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-gradient px-4 py-3 text-[12px] font-bold uppercase tracking-[0.18em] text-[#003641] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Scissors size={14} />}
            {loading ? 'Separando...' : `Separar em ate 3 refs - ${CREDIT_COST.look_split} CR`}
          </button>
        </div>
      </div>
    </div>
  )
}
