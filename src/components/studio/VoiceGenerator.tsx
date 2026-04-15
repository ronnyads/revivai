'use client'

import { useState, useEffect } from 'react'
import { Mic, Upload, Loader2 } from 'lucide-react'

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

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Script / texto</label>
        <textarea
          value={script}
          onChange={e => setScript(e.target.value)}
          placeholder="Cole o script que será narrado..."
          rows={4}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-accent"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Voz</label>
          <select
            value={voiceId}
            onChange={e => setVoiceId(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          >
            {BR_VOICES.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
            {voiceId && !BR_VOICES.find(v => v.id === voiceId) && (
              <option value={voiceId}>Minha voz clonada</option>
            )}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Velocidade ({speed}x)</label>
          <input
            type="range"
            min="0.7"
            max="1.3"
            step="0.1"
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            className="w-full mt-2 accent-accent"
          />
        </div>
      </div>

      {/* Clone de voz */}
      <div className="border border-dashed border-zinc-700 rounded-xl p-3">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 hover:text-accent transition-colors">
          {cloning
            ? <><Loader2 size={13} className="animate-spin" /> Clonando voz...</>
            : <><Upload size={13} /> Clonar minha voz (envie 30s+ de áudio)</>
          }
          <input type="file" accept="audio/*" className="hidden" onChange={handleClone} disabled={cloning} />
        </label>
        {cloneMsg && (
          <p className={`text-xs mt-1.5 ${cloneMsg.includes('sucesso') ? 'text-emerald-400' : 'text-red-400'}`}>
            {cloneMsg}
          </p>
        )}
      </div>

      <button
        onClick={() => onGenerate({ script, voice_id: voiceId, speed })}
        disabled={!script.trim()}
        className="flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 w-full"
      >
        <Mic size={15} /> Gerar voz — 1 crédito
      </button>
    </div>
  )
}
