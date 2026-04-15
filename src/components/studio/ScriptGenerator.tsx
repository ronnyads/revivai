'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function ScriptGenerator({ initial, onGenerate }: Props) {
  const [product,   setProduct]   = useState(String(initial.product   ?? ''))
  const [audience,  setAudience]  = useState(String(initial.audience  ?? ''))
  const [format,    setFormat]    = useState(String(initial.format     ?? 'reels'))
  const [hookStyle, setHookStyle] = useState(String(initial.hook_style ?? 'problema'))

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Produto / serviço</label>
        <input
          value={product}
          onChange={e => setProduct(e.target.value)}
          placeholder="Ex: Creme anti-idade, App de finanças..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Público-alvo</label>
        <input
          value={audience}
          onChange={e => setAudience(e.target.value)}
          placeholder="Ex: Mulheres 30-45 anos que querem rejuvenescer"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-accent"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Formato</label>
          <select
            value={format}
            onChange={e => setFormat(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          >
            <option value="reels">Reels / TikTok</option>
            <option value="story">Stories</option>
            <option value="feed">Feed / Anúncio</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Estilo de hook</label>
          <select
            value={hookStyle}
            onChange={e => setHookStyle(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          >
            <option value="problema">Problema</option>
            <option value="resultado">Resultado</option>
            <option value="pergunta">Pergunta</option>
            <option value="historia">História</option>
          </select>
        </div>
      </div>
      <button
        onClick={() => onGenerate({ product, audience, format, hook_style: hookStyle })}
        disabled={!product.trim() || !audience.trim()}
        className="flex items-center justify-center gap-2 bg-pink-700 hover:bg-pink-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 w-full"
      >
        <Sparkles size={15} /> Gerar script — 1 crédito
      </button>
    </div>
  )
}
