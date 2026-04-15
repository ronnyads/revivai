'use client'

import { useState, useEffect } from 'react'
import { Wand2, Video, Mic, Info } from 'lucide-react'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function LipsyncGenerator({ initial, onGenerate }: Props) {
  const [faceUrl,  setFaceUrl]  = useState(String(initial.face_url  ?? ''))
  const [audioUrl, setAudioUrl] = useState(String(initial.audio_url ?? ''))

  useEffect(() => {
    const val = String(initial.face_url ?? '')
    if (val) setFaceUrl(val)
  }, [initial.face_url])

  useEffect(() => {
    const val = String(initial.audio_url ?? '')
    if (val) setAudioUrl(val)
  }, [initial.audio_url])

  const hasFace  = !!faceUrl.trim()
  const hasAudio = !!audioUrl.trim()

  return (
    <div className="flex flex-col gap-3">
      {/* Status: vídeo/rosto */}
      <div className={`flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-xl border ${
        hasFace
          ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
          : 'text-zinc-500 bg-zinc-800/50 border-zinc-700/50'
      }`}>
        <Video size={11} />
        {hasFace ? 'Vídeo/rosto conectado' : 'Aguardando vídeo ou rosto...'}
      </div>

      {!hasFace && (
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">URL do vídeo ou imagem do rosto</label>
          <input
            value={faceUrl}
            onChange={e => setFaceUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-accent"
          />
          <p className="text-[10px] text-zinc-600 mt-1">Ou conecte um card Vídeo ou Fusão UGC</p>
        </div>
      )}

      {/* Status: áudio */}
      <div className={`flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-xl border ${
        hasAudio
          ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
          : 'text-zinc-500 bg-zinc-800/50 border-zinc-700/50'
      }`}>
        <Mic size={11} />
        {hasAudio ? 'Áudio conectado' : 'Aguardando áudio...'}
      </div>

      {!hasAudio && (
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">URL do áudio</label>
          <input
            value={audioUrl}
            onChange={e => setAudioUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-accent"
          />
          <p className="text-[10px] text-zinc-600 mt-1">Ou conecte um card Voz</p>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-2 bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-2.5">
        <Info size={11} className="text-cyan-400 mt-0.5 shrink-0" />
        <p className="text-[10px] text-zinc-400 leading-relaxed">
          <span className="text-cyan-300 font-medium">SyncLabs</span> sincroniza os lábios do vídeo com o áudio gerado. Leva ~1-2 min.
        </p>
      </div>

      <button
        onClick={() => onGenerate({ face_url: faceUrl, audio_url: audioUrl })}
        disabled={!hasFace || !hasAudio}
        className="flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 w-full"
      >
        <Wand2 size={15} /> Sincronizar lábios — 3 créditos
      </button>
    </div>
  )
}
