'use client'

import { useState, useEffect } from 'react'
import { Wand2, Video, Mic, Sparkles } from 'lucide-react'
import { CREDIT_COST } from '@/constants/studio'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function LipsyncGenerator({ initial, onGenerate }: Props) {
  const [faceUrl, setFaceUrl] = useState(String(initial.face_url ?? ''))
  const [audioUrl, setAudioUrl] = useState(String(initial.audio_url ?? ''))

  useEffect(() => {
    const value = String(initial.face_url ?? '')
    if (value) setFaceUrl(value)
  }, [initial.face_url])

  useEffect(() => {
    const value = String(initial.audio_url ?? '')
    if (value) setAudioUrl(value)
  }, [initial.audio_url])

  const hasFace = !!faceUrl.trim()
  const hasAudio = !!audioUrl.trim()
  const cost = CREDIT_COST.lipsync

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <div className="rounded-xl bg-cyan-500/10 p-2">
          <Wand2 size={16} className="text-cyan-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-[12px] font-bold leading-tight text-white">Dublagem & Sincronia Labial</h4>
          <p className="text-[10px] leading-tight text-zinc-400">Una video e audio no mesmo layout lateral para iniciar o lipsync com leitura mais limpa no board.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className={`rounded-2xl border p-3 transition-all ${hasFace ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              <Video size={12} className={hasFace ? 'text-cyan-400' : 'text-zinc-600'} /> Fonte visual
            </div>
            <p className={`text-[11px] font-bold ${hasFace ? 'text-white' : 'text-zinc-700 italic'}`}>
              {hasFace ? 'Video de referencia identificado' : 'Aguardando clipe de video...'}
            </p>
            {!hasFace ? (
              <input
                value={faceUrl}
                onChange={(e) => setFaceUrl(e.target.value)}
                placeholder="Cole a URL do video ou conecte um card..."
                className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-[12px] text-white placeholder-zinc-700 shadow-inner focus:border-cyan-500/40 focus:outline-none"
              />
            ) : null}
          </div>

          <div className={`rounded-2xl border p-3 transition-all ${hasAudio ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              <Mic size={12} className={hasAudio ? 'text-cyan-400' : 'text-zinc-600'} /> Fonte de narracao
            </div>
            <p className={`text-[11px] font-bold ${hasAudio ? 'text-white' : 'text-zinc-700 italic'}`}>
              {hasAudio ? 'Locucao premium conectada' : 'Aguardando card de voz...'}
            </p>
            {!hasAudio ? (
              <input
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="Cole a URL do audio ou conecte um card..."
                className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-[12px] text-white placeholder-zinc-700 shadow-inner focus:border-cyan-500/40 focus:outline-none"
              />
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Como funciona</p>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-300">
              O motor sincroniza a boca do video com o audio final, preservando expressao, ritmo e leitura facial.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Pipeline</p>
            <p className="mt-2 text-[10px] leading-relaxed italic text-zinc-500">
              Wav2Lip Pro esta mapeando pontos faciais para alinhar labio, abertura de boca e tempo de fala.
            </p>
          </div>

          <button
            onClick={() => onGenerate({ face_url: faceUrl, audio_url: audioUrl })}
            disabled={!hasFace || !hasAudio}
            className="group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 py-4 text-xs font-bold text-white transition-all hover:from-cyan-500 hover:to-indigo-500 active:scale-95 disabled:opacity-40"
          >
            <Sparkles size={14} />
            INICIAR DUBLAGEM NEURAL - {cost} CREDITOS
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover/btn:animate-shimmer" />
          </button>
        </div>
      </div>
    </div>
  )
}
