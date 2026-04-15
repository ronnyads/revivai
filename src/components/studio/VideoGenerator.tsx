'use client'

import { useState } from 'react'
import { Video } from 'lucide-react'
import ImageUpload from './ImageUpload'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function VideoGenerator({ initial, onGenerate }: Props) {
  const [imageUrl, setImageUrl] = useState(String(initial.source_image_url ?? ''))
  const [motion,   setMotion]   = useState(String(initial.motion_prompt    ?? ''))
  const [duration, setDuration] = useState(Number(initial.duration         ?? 5))

  return (
    <div className="flex flex-col gap-3">
      <ImageUpload
        value={imageUrl}
        onChange={setImageUrl}
        label="Imagem base (da galeria ou computador)"
        accept="image/*"
        preview
      />
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Descrição do movimento</label>
        <input
          value={motion}
          onChange={e => setMotion(e.target.value)}
          placeholder="Ex: câmera suave girando ao redor do produto..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Duração: {duration}s</label>
        <input
          type="range" min="3" max="10" step="1"
          value={duration}
          onChange={e => setDuration(Number(e.target.value))}
          className="w-full accent-accent"
        />
      </div>
      <div className="bg-zinc-800/60 rounded-xl p-3 text-xs text-zinc-500">
        Powered by <span className="text-white font-medium">Kling AI</span> — o melhor image-to-video do mercado.
        Geração leva 2–5 minutos.
      </div>
      <button
        onClick={() => onGenerate({ source_image_url: imageUrl, motion_prompt: motion, duration })}
        disabled={!imageUrl.trim()}
        className="flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 w-full"
      >
        <Video size={15} /> Gerar vídeo — 3 créditos
      </button>
    </div>
  )
}
