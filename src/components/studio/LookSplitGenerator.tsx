'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Loader2, Scissors } from 'lucide-react'
import ImageUpload from './ImageUpload'
import {
  StudioFieldLabel,
  StudioFormShell,
  StudioHint,
  StudioPanel,
  StudioPrimaryButton,
} from './StudioFormShell'
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
      return 'Chapeu'
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

  const splitReferences = useMemo(() => normalizeSplitReferences(initial.split_references), [initial.split_references])
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
    <StudioFormShell
      accent="cyan"
      icon={<Scissors size={18} />}
      title="Separar Look"
      hideHeader
      layout="split"
      chips={[
        { label: hasSource ? 'Fonte pronta' : 'Sem fonte', tone: hasSource ? 'success' : 'neutral' },
        { label: `${splitReferences.length} refs`, tone: splitReferences.length > 0 ? 'cyan' : 'neutral' },
      ]}
      media={
        <>
          <StudioPanel title="Fonte">
            <ImageUpload value={sourceUrl} onChange={setSourceUrl} label="Look ou catalogo" accept="image/*" />
          </StudioPanel>

          {splitReferences.length > 0 ? (
            <StudioPanel title="Refs">
              <div className="grid grid-cols-3 gap-2">
                {splitReferences.slice(0, 3).map((reference, index) => (
                  <div key={`${reference.url}-${index}`} className="overflow-hidden rounded-[14px] border border-white/8 bg-black/20">
                    <div className="aspect-[4/5] overflow-hidden">
                      <img src={reference.url} alt={`Referencia ${index + 1}`} className="h-full w-full object-contain" />
                    </div>
                    <div className="border-t border-white/8 px-2 py-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[8px] font-semibold ${index === 0 ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200' : 'border-white/10 bg-white/[0.05] text-white/58'}`}>
                        {index === 0 ? 'Principal' : `Ref ${index + 1}`}
                      </span>
                      <p className="mt-1 truncate text-[9px] text-white/52">{formatCategory(reference.category)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </StudioPanel>
          ) : null}
        </>
      }
      controls={
        <>
          <StudioPanel title="Observacao">
            <div className="mb-3 flex items-start gap-2 rounded-[16px] border border-amber-500/14 bg-amber-500/[0.06] px-3 py-2.5">
              <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-300" />
              <p className="text-[10px] leading-relaxed text-white/56">
                Se houver mais de 3 pecas importantes, use outra imagem em vez de perder item.
              </p>
            </div>
            <StudioFieldLabel>Nota opcional</StudioFieldLabel>
            <textarea
              value={smartPrompt}
              onChange={(event) => setSmartPrompt(event.target.value)}
              rows={4}
              placeholder="Ex: casaco + calca + chapeu."
              className="w-full resize-none rounded-[18px] border border-white/8 bg-[#0B0D0F] px-3.5 py-3 text-[12px] leading-relaxed text-white outline-none transition-colors placeholder:text-white/24 focus:border-cyan-400/30"
            />
            <div className="mt-2">
              <StudioHint>So ajuda a interpretar categorias. Nao estiliza o look.</StudioHint>
            </div>
          </StudioPanel>

          <StudioPrimaryButton accent="cyan" disabled={!hasSource || loading} onClick={handleGenerate}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Scissors size={16} />}
            {loading ? 'Separando...' : `Separar em ate 3 refs - ${CREDIT_COST.look_split} CR`}
          </StudioPrimaryButton>
        </>
      }
    />
  )
}
