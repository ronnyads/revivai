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
  const cost = is8k ? CREDIT_COST['upscale_8k'] : CREDIT_COST['upscale']

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho */}
      <div className={`border rounded-2xl p-4 flex items-start gap-3 transition-all ${is8k ? 'bg-violet-500/10 border-violet-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
        <div className={`p-2 rounded-xl mt-0.5 ${is8k ? 'bg-violet-500/20' : 'bg-emerald-500/20'}`}>
          <ZoomIn size={18} className={is8k ? 'text-violet-400' : 'text-emerald-400'} />
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-white leading-tight">
            Super Resolução & Nitidez {is8k ? '(8K Ultra)' : '(4K)'}
          </h4>
          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
            {is8k
              ? <>Gemini 3 Pro + Clarity 2x — <b>máxima qualidade possível</b>, texturas de pele e tecido reconstruídas em dois passes.</>
              : <>Elimine borrões e recupere detalhes. Transforma fotos simples em <b>fotografias profissionais ultra-nítidas</b>.</>
            }
          </p>
        </div>
      </div>

      <ImageUpload
        value={sourceUrl}
        onChange={setSourceUrl}
        label="Foto para Tratamento Profissional"
        accept="image/*"
        preview
      />

      {/* Toggle 4K / 8K */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-3">
        <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest px-1 block mb-2">Qualidade de Saída</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setQuality('4k')}
            className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition-all ${
              !is8k
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            <ZoomIn size={16} />
            <span className="text-[12px] font-black">4K</span>
            <span className="text-[10px] font-medium">{CREDIT_COST['upscale']} créditos</span>
          </button>
          <button
            onClick={() => setQuality('8k')}
            className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition-all ${
              is8k
                ? 'bg-violet-500/15 border-violet-500/40 text-violet-400'
                : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            <Zap size={16} />
            <span className="text-[12px] font-black">8K Ultra</span>
            <span className="text-[10px] font-medium">{CREDIT_COST['upscale_8k']} créditos</span>
          </button>
        </div>
      </div>

      <div className={`border rounded-xl px-3 py-2 flex items-center gap-2 ${is8k ? 'bg-violet-500/5 border-violet-500/10' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${is8k ? 'bg-violet-500' : 'bg-emerald-500'}`} />
        <span className={`text-[10px] font-medium italic ${is8k ? 'text-violet-400/80' : 'text-emerald-400/80'}`}>
          {is8k
            ? 'Motor: Gemini 3 Pro Image → Clarity Upscaler 2x — dois passes de reconstrução.'
            : 'Motor: Gemini 3 Pro Image — reconstruindo texturas de pele, olhos e tecidos em altíssima resolução.'
          }
        </span>
      </div>

      <button
        onClick={() => onGenerate({ source_url: sourceUrl, scale: 4, quality })}
        disabled={!sourceUrl.trim()}
        className={`group relative flex items-center justify-center gap-2 text-white text-[13px] font-bold py-4 rounded-2xl transition-all disabled:opacity-40 w-full mt-2 active:scale-[0.98] overflow-hidden ${
          is8k
            ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-[0_10px_30px_-10px_rgba(139,92,246,0.5)]'
            : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)]'
        }`}
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
        {is8k ? `APLICAR 8K ULTRA — ${cost} CRÉDITOS` : `APLICAR ACABAMENTO 4K — ${cost} CRÉDITOS`}
      </button>
    </div>
  )
}
