'use client'

import { useState } from 'react'
import { Sparkles, FileText } from 'lucide-react'
import { CREDIT_COST } from '@/constants/studio'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function ScriptGenerator({ initial, onGenerate }: Props) {
  const [product,   setProduct]   = useState(String(initial.product   ?? ''))
  const [audience,  setAudience]  = useState(String(initial.audience  ?? ''))
  const [format,    setFormat]    = useState(String(initial.format     ?? 'reels'))
  const [hookStyle, setHookStyle] = useState(String(initial.hook_style ?? 'problema'))

  const cost = CREDIT_COST['script']

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho de Explicação */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-amber-500/20 rounded-xl mt-0.5">
          <Sparkles size={18} className="text-amber-400" />
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-white leading-tight">Estrategista de Copy & Roteiro</h4>
          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
            Este card é o <b>cérebro do anúncio</b>. Ele cria roteiros persuasivos focados em converter espectadores em compradores.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1 mb-1.5 block">Nome do Produto / Serviço</label>
          <input
            value={product}
            onChange={e => setProduct(e.target.value)}
            placeholder="Ex: Método Seca Barriga, Mentoria de Investimentos, Fragrância Luxury Gold..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-[13px] text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500/50 transition-all shadow-inner"
          />
        </div>

        <div>
          <div className="flex items-center justify-between px-1 mb-1.5 ">
            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Público-alvo Detalhado</label>
          </div>
          <textarea
            value={audience}
            onChange={e => setAudience(e.target.value)}
            placeholder="Descreva as dores e desejos: 'Mulheres de 30 a 50 anos que sofrem com rugas e querem recuperar a autoestima sem gastar fortunas em clínicas de estética'..."
            rows={4}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-[13px] text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500/50 transition-all shadow-inner resize-none leading-relaxed"
          />
          <p className="text-[9px] text-zinc-600 italic leading-relaxed px-1 mt-1.5">
            💡 <b>Dica:</b> Quanto mais você descrever o problema do seu cliente, mais forte será o script gerado.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1 mb-1.5 block">Formato</label>
            <div className="relative">
              <select
                value={format}
                onChange={e => setFormat(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-[13px] text-white focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer transition-all"
              >
                <option value="reels">Reels / TikTok</option>
                <option value="story">Stories (Slides)</option>
                <option value="feed">Anúncio de Feed</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1 mb-1.5 block">Estilo de Gancho (Hook)</label>
            <div className="relative">
              <select
                value={hookStyle}
                onChange={e => setHookStyle(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-[13px] text-white focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer transition-all"
              >
                <option value="problema">Focar no Problema</option>
                <option value="resultado">Focar no Resultado</option>
                <option value="pergunta">Focar na Pergunta</option>
                <option value="historia">Focar na História</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => onGenerate({ product, audience, format, hook_style: hookStyle })}
        disabled={!product.trim() || !audience.trim()}
        className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-[13px] font-bold px-4 py-4 rounded-2xl transition-all disabled:opacity-40 w-full mt-2 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.5)] active:scale-[0.98] overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <FileText size={18} className="group-hover:rotate-12 transition-transform" /> 
        ESCREVER ROTEIRO ESTRATÉGICO — {cost} CRÉDITOS
      </button>
    </div>
  )
}
