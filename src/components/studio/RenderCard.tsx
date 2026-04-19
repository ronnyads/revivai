'use client'

import { useState, useEffect } from 'react'
import { Film, Video, Mic, Sparkles } from 'lucide-react'
import { CREDIT_COST } from '@/constants/studio'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function RenderCard({ initial, onGenerate }: Props) {
  const [videoUrl, setVideoUrl] = useState(String(initial.source_image_url ?? ''))
  const [audioUrl, setAudioUrl] = useState(String(initial.audio_url        ?? ''))

  // Sincroniza quando conexões do canvas injetam os valores via props
  useEffect(() => {
    const val = String(initial.source_image_url ?? '')
    if (val) setVideoUrl(val)
  }, [initial.source_image_url])

  useEffect(() => {
    const val = String(initial.audio_url ?? '')
    if (val) setAudioUrl(val)
  }, [initial.audio_url])

  const hasVideo = !!videoUrl.trim()
  const hasAudio = !!audioUrl.trim()
  const cost = CREDIT_COST['render']

  return (
    <div className="flex flex-col gap-3">
      {/* Cabeçalho de Explicação */}
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-rose-500/20 rounded-xl mt-0.5">
          <Film size={18} className="text-rose-400" />
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-white leading-tight">Masterização & Entrega Final</h4>
          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
            União perfeita de imagem e áudio. Este card processa a fusão final para gerar seu <b>anúncio em alta conversão</b>.
          </p>
        </div>
      </div>

      {/* Status de inputs conectados */}
      <div className="flex flex-col gap-1.5 px-1 pt-1">
        <div className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all ${
          hasVideo
            ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
            : 'text-zinc-400 bg-zinc-800/50 border-zinc-700/50'
        }`}>
          <Video size={12} strokeWidth={3} />
          <span className="text-[10px] font-black uppercase tracking-widest">{hasVideo ? 'Vídeo Masterizado' : 'Vídeo Master Pendente'}</span>
        </div>
        <div className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all ${
          hasAudio
            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
            : 'text-zinc-400 bg-zinc-800/50 border-zinc-700/50'
        }`}>
          <Mic size={12} strokeWidth={3} />
          <span className="text-[10px] font-black uppercase tracking-widest">{hasAudio ? 'Narração Conectada' : 'Aguardando Voz'}</span>
        </div>
      </div>

      {/* Inputs manuais (fallback se não houver conexão) */}
      {!hasVideo && (
        <div className="px-1">
          <label className="text-[9px] text-zinc-400 uppercase font-black tracking-widest mb-1.5 block">URL do Clipe de Vídeo</label>
          <input
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-[11px] text-white placeholder-zinc-700 focus:outline-none focus:border-rose-500/40"
          />
        </div>
      )}
      {!hasAudio && (
        <div className="px-1">
          <label className="text-[9px] text-zinc-400 uppercase font-black tracking-widest mb-1.5 block">URL da Narração</label>
          <input
            value={audioUrl}
            onChange={e => setAudioUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-[11px] text-white placeholder-zinc-700 focus:outline-none focus:border-rose-500/40"
          />
        </div>
      )}

      <div className="flex items-center gap-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
        <div className="w-1 h-1 rounded-full bg-rose-500 animate-pulse shrink-0" />
        <p className="text-[10px] text-zinc-400 leading-relaxed italic">
          O processamento FFmpeg 4.0 está otimizando o bitrate para carregamento rápido em redes sociais.
        </p>
      </div>

      <button
        onClick={() => onGenerate({ source_image_url: videoUrl, audio_url: audioUrl })}
        disabled={!hasVideo || !hasAudio}
        className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-[13px] font-bold py-4 rounded-2xl transition-all disabled:opacity-40 w-full mt-2 shadow-[0_10px_30px_-10px_rgba(225,29,72,0.5)] active:scale-[0.98] overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Sparkles size={18} className="group-hover:rotate-12 transition-transform" /> 
        FINALIZAR ANÚNCIO MASTER — {cost} CRÉDITO
      </button>
    </div>
  )
}
