'use client'

import { useState } from 'react'
import { Sparkles, FileText } from 'lucide-react'
import { CREDIT_COST } from '@/constants/studio'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function ScriptGenerator({ initial, onGenerate }: Props) {
  const [product, setProduct] = useState(String(initial.product ?? ''))
  const [audience, setAudience] = useState(String(initial.audience ?? ''))
  const [format, setFormat] = useState(String(initial.format ?? 'reels'))
  const [hookStyle, setHookStyle] = useState(String(initial.hook_style ?? 'problema'))

  const cost = CREDIT_COST.script

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
        <div className="mt-0.5 rounded-xl bg-amber-500/20 p-2">
          <Sparkles size={18} className="text-amber-400" />
        </div>
        <div>
          <h4 className="text-[13px] font-bold leading-tight text-white">Estrategista de Copy e Roteiro</h4>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
            Este card e o <b>cerebro do anuncio</b>. Ele cria roteiros persuasivos focados em converter
            espectadores em compradores.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Nome do Produto / Servico
          </label>
          <input
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="Ex: Metodo Seca Barriga, Mentoria de Investimentos, Fragrancia Luxury Gold..."
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-[13px] text-white placeholder-zinc-700 shadow-inner transition-all focus:border-amber-500/50 focus:outline-none"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between px-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Publico-alvo Detalhado
            </label>
          </div>
          <textarea
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="Descreva as dores e desejos: 'Mulheres de 30 a 50 anos que sofrem com rugas e querem recuperar a autoestima sem gastar fortunas em clinicas de estetica'..."
            rows={4}
            className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-[13px] leading-relaxed text-white placeholder-zinc-700 shadow-inner transition-all focus:border-amber-500/50 focus:outline-none"
          />
          <p className="mt-1.5 px-1 text-[9px] italic leading-relaxed text-zinc-600">
            <b>Dica:</b> Quanto mais voce descrever o problema do seu cliente, mais forte sera o script gerado.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Formato
            </label>
            <div className="relative">
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-[13px] text-white transition-all focus:border-amber-500/50 focus:outline-none"
              >
                <option value="reels">Reels / TikTok</option>
                <option value="feed">Anuncio de Feed</option>
                <option value="youtube">Video para YouTube</option>
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Estilo de Gancho
            </label>
            <div className="relative">
              <select
                value={hookStyle}
                onChange={(e) => setHookStyle(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-[13px] text-white transition-all focus:border-amber-500/50 focus:outline-none"
              >
                <option value="problema">Focar no Problema</option>
                <option value="resultado">Focar no Resultado</option>
                <option value="pergunta">Focar na Pergunta</option>
                <option value="historia">Focar na Historia</option>
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => onGenerate({ product, audience, format, hook_style: hookStyle })}
        disabled={!product.trim() || !audience.trim()}
        className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-4 text-[13px] font-bold text-white shadow-[0_10px_30px_-10px_rgba(245,158,11,0.5)] transition-all active:scale-[0.98] hover:from-amber-500 hover:to-orange-500 disabled:opacity-40"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
        <FileText size={18} className="transition-transform group-hover:rotate-12" />
        ESCREVER ROTEIRO ESTRATEGICO - {cost} CREDITOS
      </button>
    </div>
  )
}
