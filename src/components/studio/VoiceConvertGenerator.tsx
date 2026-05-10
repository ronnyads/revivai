'use client'

import { useState } from 'react'
import { Wand2 } from 'lucide-react'
import { CREDIT_COST } from '@/constants/studio'
import VoiceLibraryPicker from './VoiceLibraryPicker'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function VoiceConvertGenerator({ initial, onGenerate }: Props) {
  const [targetVoiceId, setTargetVoiceId] = useState(
    String(initial.target_voice_id ?? 'EXAVITQu4vr4xnSDxMaL'),
  )

  const audioUrl = String(initial.audio_url ?? '')
  const cost = CREDIT_COST['voice_convert']

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-violet-500/20 rounded-xl mt-0.5">
          <Wand2 size={18} className="text-violet-400" />
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-white leading-tight">Conversão de Voz</h4>
          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
            Transforma um áudio existente em outra voz. Conecte um áudio e escolha a voz destino.
          </p>
        </div>
      </div>

      <div>
        <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1 mb-1.5 block">
          Áudio de Origem
        </label>
        {audioUrl ? (
          <div className="bg-zinc-900 border border-zinc-700/60 rounded-2xl px-4 py-3 text-[12px] text-emerald-400 font-medium">
            Áudio conectado
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-700/60 rounded-2xl px-4 py-3 text-[12px] text-zinc-500">
            Conecte um card de Voz ou áudio ao input deste card
          </div>
        )}
      </div>

      <div>
        <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1 mb-1.5 block">
          Voz Destino
        </label>
        <VoiceLibraryPicker
          value={targetVoiceId}
          onChange={setTargetVoiceId}
          accentClass="violet"
          showCloneUpload={false}
        />
      </div>

      <button
        onClick={() => onGenerate({ target_voice_id: targetVoiceId, audio_url: audioUrl })}
        disabled={!audioUrl}
        className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-[13px] font-bold px-4 py-4 rounded-2xl transition-all disabled:opacity-40 w-full mt-2 shadow-[0_10px_30px_-10px_rgba(139,92,246,0.5)] active:scale-[0.98] overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Wand2 size={18} className="group-hover:scale-110 transition-transform" />
        CONVERTER VOZ — {cost} CRÉDITOS
      </button>
    </div>
  )
}
