'use client'

import { useState } from 'react'
import { ZoomIn, Sparkles } from 'lucide-react'
import ImageUpload from './ImageUpload'
import { CREDIT_COST } from '@/constants/studio'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function UpscaleCard({ initial, onGenerate }: Props) {
  const [sourceUrl, setSourceUrl] = useState(String(initial.source_url ?? ''))
  const [scale,     setScale]     = useState(Number(initial.scale      ?? 4))

  const cost = CREDIT_COST['upscale']

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho de Explicação */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-emerald-500/20 rounded-xl mt-0.5">
          <ZoomIn size={18} className="text-emerald-400" />
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-white leading-tight">Super Resolução & Nitidez (4K)</h4>
          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
            Elimine borrões e recupere detalhes. Este card transforma fotos simples em <b>fotografias profissionais ultra-nítidas</b>.
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

      <div className="space-y-2.5 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-center justify-between px-1">
          <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Nível de Realismo (Upscale)</label>
          <span className="text-[11px] text-emerald-400 font-black">{scale}X Mais Nitidez</span>
        </div>
        <div className="px-1">
          <input
            type="range" min="2" max="4" step="1"
            value={scale}
            onChange={e => setScale(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 mt-2"
          />
          <div className="flex justify-between mt-1.5">
             <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-tighter italic">Normal (HD)</span>
             <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-tighter italic">Ultra (4K)</span>
          </div>
        </div>
      </div>

      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2 flex items-center gap-2">
         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
         <span className="text-[10px] text-emerald-400/80 font-medium italic">Motor Google Imagen 4 Ultra — reconstruindo texturas de pele, olhos e tecidos em altíssima resolução.</span>
      </div>

      <button
        onClick={() => onGenerate({ source_url: sourceUrl, scale })}
        disabled={!sourceUrl.trim()}
        className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-[13px] font-bold py-4 rounded-2xl transition-all disabled:opacity-40 w-full mt-2 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)] active:scale-[0.98] overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Sparkles size={18} className="group-hover:rotate-12 transition-transform" /> 
        APLICAR ACABAMENTO 4K — {cost} CRÉDITOS
      </button>
    </div>
  )
}
