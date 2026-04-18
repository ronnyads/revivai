'use client'

import { useState, useEffect } from 'react'
import { Mic, Upload, Loader2 } from 'lucide-react'
import { CREDIT_COST } from '@/constants/studio'

const BR_VOICES = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (masculino)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (feminino)' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (feminino)' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli (feminino)' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh (masculino)' },
]

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function VoiceGenerator({ initial, onGenerate }: Props) {
  const [script,  setScript]  = useState(String(initial.script   ?? ''))
  const [voiceId, setVoiceId] = useState(String(initial.voice_id ?? 'EXAVITQu4vr4xnSDxMaL'))
  const [speed,   setSpeed]   = useState(Number(initial.speed    ?? 1.0))
  const [cloning, setCloning] = useState(false)
  const [cloneMsg, setCloneMsg] = useState('')

  // Sincroniza script quando conexão Script → Voice injeta via props
  useEffect(() => {
    const val = String(initial.script ?? '')
    if (val) setScript(val)
  }, [initial.script])

  async function handleClone(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCloning(true)
    setCloneMsg('')
    try {
      const form = new FormData()
      form.append('audio', file)
      form.append('name', 'Minha Voz')
      const res = await fetch('/api/studio/voice-clone', { method: 'POST', body: form })
      const data = await res.json()
      if (data.voice_id) {
        setVoiceId(data.voice_id)
        setCloneMsg('Voz clonada com sucesso!')
      } else {
        setCloneMsg(data.error ?? 'Erro ao clonar voz')
      }
    } finally {
      setCloning(false)
    }
  }

  const cost = CREDIT_COST['voice']

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho de Explicação */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-emerald-500/20 rounded-xl mt-0.5">
          <Mic size={18} className="text-emerald-400" />
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-white leading-tight">Estúdio de Voz & Narração</h4>
          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
            Transforme seu roteiro em fala. Escolha uma das <b>vozes neurais</b> ou clone a sua própria voz para máxima autenticidade.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1 mb-1.5 block">Texto para Narração</label>
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
            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1 block">Voz Selecionada</label>
            <div className="relative">
              <select
                value={voiceId}
                onChange={e => setVoiceId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-[13px] text-white focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer transition-all font-medium"
              >
                {BR_VOICES.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
                {voiceId && !BR_VOICES.find(v => v.id === voiceId) && (
                  <option value={voiceId}>Minha Voz Clonada 👤</option>
                )}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
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

        <div className={`group relative overflow-hidden rounded-2xl border transition-all duration-500 ${
          cloning 
            ? 'bg-emerald-500/5 border-emerald-500/50 ring-2 ring-emerald-500/20' 
            : 'bg-zinc-900/60 border-zinc-800 hover:border-emerald-500/40 shadow-xl'
        }`}>
          {cloning && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
          )}

          <label className="relative flex items-center gap-4 p-5 cursor-pointer">
            <div className={`p-3 rounded-xl transition-all duration-300 ${
              cloning 
                ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-pulse' 
                : 'bg-zinc-800 text-zinc-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-400'
            }`}>
              {cloning ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
            </div>
            
            <div className="flex-1">
              <span className={`block font-black text-[11px] uppercase tracking-widest ${cloning ? 'text-emerald-400' : 'text-zinc-300'}`}>
                {cloning ? 'IA Processando sua Voz...' : 'Clonagem Instantânea'}
              </span>
              <span className="block text-[10px] text-zinc-500 mt-1 leading-relaxed">
                {cloning 
                  ? 'Aguarde 15-30s enquanto mapeamos suas cordas vocais...' 
                  : 'Suba 30s-1min de áudio limpo para falar como você.'}
              </span>
            </div>

            <input type="file" accept="audio/*" className="hidden" onChange={handleClone} disabled={cloning} />
          </label>

          {cloneMsg && (
            <div className={`mt-0 border-t p-3 text-[10px] font-bold text-center transition-all animate-in fade-in slide-in-from-top-2 ${
              cloneMsg.includes('sucesso') 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {cloneMsg.includes('sucesso') && '✨ '} {cloneMsg}
            </div>
          )}

          {!cloning && !cloneMsg && (
            <div className="px-5 pb-4">
              <div className="flex gap-4 text-[8px] text-zinc-600 uppercase font-black tracking-tighter">
                <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-zinc-700" /> Sem eco</span>
                <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-zinc-700" /> Sem música</span>
                <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-zinc-700" /> Tom natural</span>
              </div>
            </div>
          )}
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
