'use client'

import { useState } from 'react'
import { ZoomIn } from 'lucide-react'
import ImageUpload from './ImageUpload'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function UpscaleCard({ initial, onGenerate }: Props) {
  const [sourceUrl, setSourceUrl] = useState(String(initial.source_url ?? ''))
  const [scale,     setScale]     = useState(Number(initial.scale      ?? 4))

  return (
    <div className="flex flex-col gap-3">
      <ImageUpload
        value={sourceUrl}
        onChange={setSourceUrl}
        label="Foto (da galeria, computador ou restaurada)"
        accept="image/*"
        preview
      />
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Escala: {scale}x</label>
        <input
          type="range" min="2" max="4" step="1"
          value={scale}
          onChange={e => setScale(Number(e.target.value))}
          className="w-full accent-accent"
        />
      </div>
      <div className="bg-zinc-800/60 rounded-xl p-3 text-xs text-zinc-500">
        Processamento Neural: <span className="text-white font-medium">Ultra HD Enhancer</span> — transforma fotos antigas
        em imagens nítidas para anúncios.
      </div>
      <button
        onClick={() => onGenerate({ source_url: sourceUrl, scale })}
        disabled={!sourceUrl.trim()}
        className="flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 w-full"
      >
        <ZoomIn size={15} /> Fazer upscale — 1 crédito
      </button>
    </div>
  )
}
