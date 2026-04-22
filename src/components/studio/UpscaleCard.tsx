'use client'

import { useState } from 'react'
import { ZoomIn, Sparkles, Zap } from 'lucide-react'
import ImageUpload from './ImageUpload'
import { CREDIT_COST } from '@/constants/studio'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function UpscaleCard({ initial, onGenerate }: Props) {
  const [sourceUrl, setSourceUrl] = useState(String(initial.source_url ?? ''))
  const [quality, setQuality] = useState<'4k' | '8k'>((initial.quality as '4k' | '8k') ?? '4k')

  const is8k = quality === '8k'
  const cost = is8k ? CREDIT_COST.upscale_8k : CREDIT_COST.upscale

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <div className={`rounded-xl p-2 ${is8k ? 'bg-violet-500/10' : 'bg-emerald-500/10'}`}>
          <ZoomIn size={16} className={is8k ? 'text-violet-400' : 'text-emerald-400'} />
        </div>
        <div className="flex-1">
          <h4 className="text-[12px] font-bold leading-tight text-white">Super Resolucao & Nitidez</h4>
          <p className="text-[10px] leading-tight text-zinc-400">Recupere detalhes e deixe a foto pronta para uso comercial em 4K ou 8K.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-3">
          <ImageUpload value={sourceUrl} onChange={setSourceUrl} label="Foto para Tratamento Profissional" accept="image/*" preview />

          <div className={`rounded-2xl border px-3 py-3 ${is8k ? 'border-violet-500/20 bg-violet-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${is8k ? 'text-violet-300' : 'text-emerald-300'}`}>Motor ativo</p>
            <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">
              {is8k
                ? 'Gemini 3 Pro + Clarity 2x em dois passes para maxima limpeza e reconstrução.'
                : 'Gemini 3 Pro em modo de nitidez premium para restaurar pele, tecido e contraste.'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
            <label className="mb-2 block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Qualidade de saida</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setQuality('4k')}
                className={`flex flex-col items-center gap-1 rounded-xl border py-4 transition-all ${
                  !is8k ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400' : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                <ZoomIn size={16} />
                <span className="text-[12px] font-black">4K</span>
                <span className="text-[10px] font-medium">{CREDIT_COST.upscale} creditos</span>
              </button>
              <button
                onClick={() => setQuality('8k')}
                className={`flex flex-col items-center gap-1 rounded-xl border py-4 transition-all ${
                  is8k ? 'border-violet-500/40 bg-violet-500/15 text-violet-400' : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                <Zap size={16} />
                <span className="text-[12px] font-black">8K Ultra</span>
                <span className="text-[10px] font-medium">{CREDIT_COST.upscale_8k} creditos</span>
              </button>
            </div>
          </div>

          <div className={`rounded-2xl border px-3 py-3 ${is8k ? 'border-violet-500/20 bg-violet-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${is8k ? 'text-violet-300' : 'text-emerald-300'}`}>Resultado esperado</p>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-300">
              {is8k
                ? 'Entrega máxima para assets hero, campanhas premium e recorte de detalhes finos.'
                : 'Acabamento limpo e rápido para galeria, anúncios e reforço de definição.'}
            </p>
          </div>

          <button
            onClick={() => onGenerate({ source_url: sourceUrl, scale: 4, quality })}
            disabled={!sourceUrl.trim()}
            className={`group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-40 ${
              is8k
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-[0_10px_30px_-10px_rgba(139,92,246,0.5)] hover:from-violet-500 hover:to-purple-500'
                : 'bg-gradient-to-r from-emerald-600 to-green-600 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)] hover:from-emerald-500 hover:to-green-500'
            }`}
          >
            <Sparkles size={14} />
            {is8k ? `APLICAR 8K ULTRA - ${cost} CREDITOS` : `APLICAR ACABAMENTO 4K - ${cost} CREDITOS`}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover/btn:animate-shimmer" />
          </button>
        </div>
      </div>
    </div>
  )
}
