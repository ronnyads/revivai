'use client'

import { useState, useEffect } from 'react'
import { Wand2, Video, Mic, Info, Sparkles } from 'lucide-react'
import { CREDIT_COST } from '@/constants/studio'

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
  const cost = CREDIT_COST['lipsync']

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho de Explicação */}
      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-cyan-500/20 rounded-xl mt-0.5">
          <Wand2 size={18} className="text-cyan-400" />
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-white leading-tight">Dublagem & Sincronia Labial</h4>
          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
            Este card faz o personagem <b>falar de verdade</b>. Ele mapeia os lábios do vídeo para baterem perfeitamente com o áudio selecionado.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Status: vídeo/rosto */}
        <div className={`group relative flex items-center gap-4 p-4 rounded-2xl border transition-all ${
          hasFace
            ? 'bg-cyan-500/5 border-cyan-500/30'
            : 'bg-zinc-900 border-zinc-800'
        }`}>
          <div className={`p-2.5 rounded-xl transition-all duration-300 ${hasFace ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'bg-zinc-800 text-zinc-600'}`}>
            <Video size={16} strokeWidth={2.5} />
          </div>
          <div className="flex-1">
             <span className="block text-[10px] text-zinc-500 uppercase font-black tracking-widest leading-none">Fonte Visual Master</span>
             <span className={`block text-[12px] font-bold mt-1.5 ${hasFace ? 'text-white' : 'text-zinc-700 italic'}`}>
               {hasFace ? '✓ Vídeo de Referência Identificado' : 'Aguardando Clipe de Vídeo...'}
             </span>
          </div>
          {hasFace && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_cyan]" />}
        </div>

        {!hasFace && (
          <div className="px-1">
            <input
              value={faceUrl}
              onChange={e => setFaceUrl(e.target.value)}
              placeholder="Cole a URL do vídeo ou conecte um card de Vídeo/Modelo..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-[12px] text-white placeholder-zinc-700 focus:outline-none focus:border-cyan-500/40 shadow-inner"
            />
          </div>
        )}

        {/* Status: áudio */}
        <div className={`group relative flex items-center gap-4 p-4 rounded-2xl border transition-all ${
          hasAudio
            ? 'bg-cyan-500/5 border-cyan-500/30'
            : 'bg-zinc-900 border-zinc-800'
        }`}>
          <div className={`p-2.5 rounded-xl transition-all duration-300 ${hasAudio ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'bg-zinc-800 text-zinc-600'}`}>
            <Mic size={16} strokeWidth={2.5} />
          </div>
          <div className="flex-1">
             <span className="block text-[10px] text-zinc-500 uppercase font-black tracking-widest leading-none">Fonte de Narração</span>
             <span className={`block text-[12px] font-bold mt-1.5 ${hasAudio ? 'text-white' : 'text-zinc-700 italic'}`}>
               {hasAudio ? '✓ Locução Premium Conectada' : 'Aguardando Card de Voz...'}
             </span>
          </div>
          {hasAudio && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_cyan]" />}
        </div>

        {!hasAudio && (
          <div className="px-1">
            <input
              value={audioUrl}
              onChange={e => setAudioUrl(e.target.value)}
              placeholder="Cole a URL do áudio ou conecte um card de Voz..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-[12px] text-white placeholder-zinc-700 focus:outline-none focus:border-cyan-500/40 shadow-inner"
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl p-4">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse mt-1.5 shrink-0" />
        <p className="text-[10px] text-zinc-500 leading-relaxed font-medium italic">
          O motor <span className="text-cyan-400 font-bold">Wav2Lip Pro</span> está mapeando 68 pontos faciais para sincronia absoluta entre áudio e movimento labial.
        </p>
      </div>

      <button
        onClick={() => onGenerate({ face_url: faceUrl, audio_url: audioUrl })}
        disabled={!hasFace || !hasAudio}
        className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-[13px] font-bold py-4 rounded-2xl transition-all disabled:opacity-40 w-full mt-2 shadow-[0_10px_30px_-10px_rgba(8,145,178,0.5)] active:scale-[0.98] overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Sparkles size={18} className="group-hover:rotate-12 transition-transform" /> 
        INICIAR DUBLAGEM NEURAL — {cost} CRÉDITOS
      </button>
    </div>
  )
}
