'use client'

import { useState } from 'react'
import { Film, Video, Mic } from 'lucide-react'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function RenderCard({ initial, onGenerate }: Props) {
  const [videoUrl, setVideoUrl] = useState(String(initial.source_image_url ?? ''))
  const [audioUrl, setAudioUrl] = useState(String(initial.audio_url        ?? ''))

  const hasVideo = !!videoUrl.trim()
  const hasAudio = !!audioUrl.trim()

  return (
    <div className="flex flex-col gap-3">
      {/* Status de inputs conectados */}
      <div className="flex flex-col gap-1.5">
        <div className={`flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-xl border ${
          hasVideo
            ? 'text-blue-400 bg-blue-500/10 border-blue-500/30'
            : 'text-zinc-500 bg-zinc-800/50 border-zinc-700/50'
        }`}>
          <Video size={11} />
          {hasVideo ? 'Vídeo conectado' : 'Aguardando vídeo...'}
        </div>
        <div className={`flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-xl border ${
          hasAudio
            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
            : 'text-zinc-500 bg-zinc-800/50 border-zinc-700/50'
        }`}>
          <Mic size={11} />
          {hasAudio ? 'Voz conectada' : 'Aguardando voz...'}
        </div>
      </div>

      {/* Inputs manuais (fallback se não houver conexão) */}
      {!hasVideo && (
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">URL do vídeo</label>
          <input
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-accent"
          />
        </div>
      )}
      {!hasAudio && (
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">URL do áudio</label>
          <input
            value={audioUrl}
            onChange={e => setAudioUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-accent"
          />
        </div>
      )}

      <div className="bg-zinc-800/60 rounded-xl p-3 text-xs text-zinc-500">
        Combina vídeo + voz em um <span className="text-white font-medium">MP4 final</span> pronto para publicar.
      </div>

      <button
        onClick={() => onGenerate({ source_image_url: videoUrl, audio_url: audioUrl })}
        disabled={!hasVideo || !hasAudio}
        className="flex items-center justify-center gap-2 bg-rose-700 hover:bg-rose-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 w-full"
      >
        <Film size={15} /> Renderizar vídeo final — 1 crédito
      </button>
    </div>
  )
}
