'use client'

import { useState } from 'react'
import { Sparkles, User } from 'lucide-react'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function ImageGenerator({ initial, onGenerate }: Props) {
  const [prompt, setPrompt]       = useState(String(initial.prompt ?? ''))
  const [style, setStyle]         = useState(String(initial.style ?? 'ugc'))
  const [aspect, setAspect]       = useState(String(initial.aspect_ratio ?? '9:16'))

  return (
    <div className="flex flex-col gap-3">
      {!!initial.model_prompt && (
        <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1.5 rounded-xl">
          <User size={11} /> Modelo conectado
        </div>
      )}
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="Descreva a imagem que quer gerar..."
        rows={3}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-accent"
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Estilo</label>
          <select
            value={style}
            onChange={e => setStyle(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          >
            <option value="ugc">UGC / Autêntico</option>
            <option value="product">Produto profissional</option>
            <option value="lifestyle">Lifestyle</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Formato</label>
          <select
            value={aspect}
            onChange={e => setAspect(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          >
            <option value="9:16">9:16 — Reels/Story</option>
            <option value="1:1">1:1 — Feed</option>
            <option value="16:9">16:9 — YouTube</option>
          </select>
        </div>
      </div>
      <button
        onClick={() => onGenerate({ prompt, style, aspect_ratio: aspect })}
        disabled={!prompt.trim()}
        className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 w-full"
      >
        <Sparkles size={15} /> Gerar imagem — 1 crédito
      </button>
    </div>
  )
}
