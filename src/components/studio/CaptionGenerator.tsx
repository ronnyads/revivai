'use client'

import { useState, useEffect } from 'react'
import { Captions } from 'lucide-react'
import ImageUpload from './ImageUpload'
import { CREDIT_COST } from '@/constants/studio'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function CaptionGenerator({ initial, onGenerate }: Props) {
  const [audioUrl, setAudioUrl] = useState(String(initial.audio_url ?? ''))

  // Sincroniza audio_url quando conexão Voice → Caption injeta via props
  useEffect(() => {
    const val = String(initial.audio_url ?? '')
    if (val) setAudioUrl(val)
  }, [initial.audio_url])

  const cost = CREDIT_COST['caption']

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho de Explicação */}
      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-cyan-500/20 rounded-xl mt-0.5">
          <Captions size={18} className="text-cyan-400" />
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-white leading-tight">Legendas Sincronizadas (SRT)</h4>
          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
            Aumente o alcance do seu anúncio. Este card transcreve o áudio e gera <b>legendas perfeitamente sincronizadas</b> frame a frame.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
          !!audioUrl.trim()
            ? 'bg-cyan-500/5 border-cyan-500/30'
            : 'bg-zinc-900 border-zinc-800'
        }`}>
          <div className={`p-2 rounded-lg ${!!audioUrl.trim() ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-800 text-zinc-600'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          </div>
          <div className="flex-1">
             <span className="block text-[10px] text-zinc-500 uppercase font-black tracking-widest">Fonte de Áudio</span>
             <span className={`block text-[11px] font-bold mt-0.5 ${!!audioUrl.trim() ? 'text-white' : 'text-zinc-700 italic'}`}>
               {!!audioUrl.trim() ? '✓ Áudio Pronto para Transcrição' : 'Aguardando Áudio...'}
             </span>
          </div>
        </div>

        <ImageUpload
          value={audioUrl}
          onChange={setAudioUrl}
          label="Arquivo de Áudio (Upload Manual)"
          accept="audio/*"
          preview={false}
        />
      </div>

      <div className="flex items-start gap-3 bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-4">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 text-[10px] font-black text-cyan-400 uppercase tracking-tighter shadow-sm">
          SRT
        </div>
        <p className="text-[10px] text-zinc-500 leading-relaxed italic">
          O motor <span className="text-cyan-400 font-bold">Whisper V3</span> analisará cada pausa e entonação para garantir sincronia absoluta.
        </p>
      </div>

      <button
        onClick={() => onGenerate({ audio_url: audioUrl })}
        disabled={!audioUrl.trim()}
        className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-[13px] font-bold py-4 rounded-2xl transition-all disabled:opacity-40 w-full mt-2 shadow-[0_10px_30px_-10px_rgba(8,145,178,0.5)] active:scale-[0.98] overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Captions size={18} className="group-hover:scale-110 transition-transform" /> 
        GERAR LEGENDAS DINÂMICAS — {cost} CRÉDITOS
      </button>
    </div>
  )
}
