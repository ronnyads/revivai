'use client'

import { useState, useEffect } from 'react'
import { Wand2, Video, Mic } from 'lucide-react'
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

  const hasFace  = !!faceUrl.trim()
  const hasAudio = !!audioUrl.trim()
  const cost = CREDIT_COST.lipsync

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-cyan-500/20 rounded-xl mt-0.5">
          <Wand2 size={18} className="text-cyan-400" />
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-white leading-tight">Lip Sync Neural</h4>
          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
            Sincroniza a boca do vídeo com o áudio, preservando expressão, ritmo e leitura facial.
          </p>
        </div>
      </div>

      {/* Fonte Visual */}
      <div>
        <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1 mb-1.5 block">
          Fonte Visual
        </label>
        {hasFace ? (
          <div className="bg-zinc-900 border border-emerald-500/40 rounded-2xl px-4 py-3 text-[12px] text-emerald-400 font-medium">
            Vídeo conectado
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="bg-zinc-900 border border-zinc-700/60 rounded-2xl px-4 py-3 text-[12px] text-zinc-500 flex items-center gap-2">
              <Video size={13} className="text-zinc-600 shrink-0" />
              Conecte um card de Vídeo ao input deste card
            </div>
            <input
              value={faceUrl}
              onChange={e => setFaceUrl(e.target.value)}
              placeholder="ou cole a URL do vídeo aqui"
              className="w-full bg-zinc-900 border border-zinc-700/60 rounded-2xl px-4 py-3 text-[12px] text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 transition-all"
            />
          </div>
        )}
      </div>

      {/* Fonte de Áudio */}
      <div>
        <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1 mb-1.5 block">
          Fonte de Áudio
        </label>
        {hasAudio ? (
          <div className="bg-zinc-900 border border-emerald-500/40 rounded-2xl px-4 py-3 text-[12px] text-emerald-400 font-medium">
            Áudio conectado
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="bg-zinc-900 border border-zinc-700/60 rounded-2xl px-4 py-3 text-[12px] text-zinc-500 flex items-center gap-2">
              <Mic size={13} className="text-zinc-600 shrink-0" />
              Conecte um card de Voz ao input deste card
            </div>
            <input
              value={audioUrl}
              onChange={e => setAudioUrl(e.target.value)}
              placeholder="ou cole a URL do áudio aqui"
              className="w-full bg-zinc-900 border border-zinc-700/60 rounded-2xl px-4 py-3 text-[12px] text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 transition-all"
            />
          </div>
        )}
      </div>

      {/* Botão */}
      <button
        onClick={() => onGenerate({ face_url: faceUrl, audio_url: audioUrl })}
        disabled={!hasFace || !hasAudio}
        className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-[13px] font-bold px-4 py-4 rounded-2xl transition-all disabled:opacity-40 w-full mt-2 shadow-[0_10px_30px_-10px_rgba(6,182,212,0.5)] active:scale-[0.98] overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Wand2 size={18} className="group-hover:scale-110 transition-transform" />
        INICIAR LIP SYNC — {cost} CRÉDITOS
      </button>
    </div>
  )
}
