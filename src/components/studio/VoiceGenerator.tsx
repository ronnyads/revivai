'use client'

import { useState, useEffect } from 'react'
import { Mic } from 'lucide-react'
import { CREDIT_COST } from '@/constants/studio'
import VoiceLibraryPicker from './VoiceLibraryPicker'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function VoiceGenerator({ initial, onGenerate }: Props) {
  const [script,  setScript]  = useState(String(initial.script   ?? ''))
  const [voiceId, setVoiceId] = useState(String(initial.voice_id ?? 'EXAVITQu4vr4xnSDxMaL'))
  const [speed,   setSpeed]   = useState(Number(initial.speed    ?? 1.0))

  useEffect(() => {
    const val = String(initial.script ?? '')
    if (val) setScript(val)
  }, [initial.script])

  const cost = CREDIT_COST['voice']

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-emerald-500/20 rounded-xl mt-0.5">
          <Mic size={18} className="text-emerald-400" />
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-white leading-tight">Estúdio de Voz & Narração</h4>
          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
            Transforme seu roteiro em fala. Escolha uma das <b>vozes neurais</b> ou clone a sua própria voz.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1 mb-1.5 block">
            Texto para Narração
          </label>
          <textarea
            value={script}
            onChange={e => setScript(e.target.value)}
            placeholder="O robô vai ler exatamente o que você escrever aqui..."
            rows={5}
            className="w-full bg-zinc-900 border border-zinc-700/60 rounded-2xl px-4 py-3 text-[13px] text-white placeholder-zinc-700 focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner leading-relaxed resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1 block">
              Voz
            </label>
            <VoiceLibraryPicker
              value={voiceId}
              onChange={setVoiceId}
              accentClass="emerald"
              showCloneUpload={false}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Velocidade</label>
              <span className="text-[10px] text-emerald-400 font-bold">{speed}x</span>
            </div>
            <div className="pt-2 px-1">
              <input
                type="range"
                min="0.7"
                max="1.3"
                step="0.05"
                value={speed}
                onChange={e => setSpeed(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between mt-1.5">
                <span className="text-[8px] text-zinc-600 uppercase font-bold tracking-tighter italic">Lento</span>
                <span className="text-[8px] text-zinc-600 uppercase font-bold tracking-tighter italic">Rápido</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1 mb-1.5 block">
            Clonar minha voz
          </label>
          <VoiceLibraryPicker
            value={voiceId}
            onChange={setVoiceId}
            accentClass="emerald"
            showCloneUpload={true}
          />
        </div>
      </div>

      <button
        onClick={() => onGenerate({ script, voice_id: voiceId, speed })}
        disabled={!script.trim()}
        className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[13px] font-bold px-4 py-4 rounded-2xl transition-all disabled:opacity-40 w-full mt-2 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)] active:scale-[0.98] overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Mic size={18} className="group-hover:scale-110 transition-transform" />
        GERAR LOCUÇÃO PROFISSIONAL — {cost} CRÉDITOS
      </button>
    </div>
  )
}
