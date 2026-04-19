'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Image, AlertTriangle } from 'lucide-react'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function UGCBundleGenerator({ initial, onGenerate }: Props) {
  const [loading, setLoading] = useState(false)
  const sourceUrl = (initial.source_url as string) || ''

  async function handleGenerate() {
    if (!sourceUrl) return
    setLoading(true)
    try {
      onGenerate({ source_url: sourceUrl })
    } finally {
      setLoading(false)
    }
  }

  if (!sourceUrl) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Image size={20} className="text-indigo-400" />
        </div>
        <div>
          <p className="text-xs font-semibold text-white">Conecte uma imagem</p>
          <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
            Arraste a saída de um card de<br />Modelo UGC, Imagem ou Fusão até aqui
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <img
        src={sourceUrl}
        alt="Fonte"
        className="w-full rounded-xl object-contain bg-black/20 max-h-48"
      />
      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl px-3 py-2">
        <p className="text-[10px] text-indigo-400 font-medium">O que será gerado</p>
        <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
          8 fotos UGC da mesma modelo em ângulos e poses diferentes (frontal, perfil, ¾, dinâmica...)
        </p>
      </div>
      <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2">
        <AlertTriangle size={11} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-300/80 leading-relaxed">
          <span className="font-semibold text-amber-400">Dica:</span> Funciona melhor com Modelo UGC puro. Se a imagem tiver produto (Fusão), o produto pode variar entre as poses — prefira o card <span className="text-white font-medium">Cena Livre</span> para controle total.
        </p>
      </div>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-[13px] font-bold py-3 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98]"
      >
        {loading
          ? <><Loader2 size={15} className="animate-spin" /> Gerando...</>
          : <><Sparkles size={15} /> Gerar 8 Poses UGC — 60 CR</>
        }
      </button>
    </div>
  )
}
