'use client'

import { useState } from 'react'
import { Captions } from 'lucide-react'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function CaptionGenerator({ initial, onGenerate }: Props) {
  const [audioUrl, setAudioUrl] = useState(String(initial.audio_url ?? ''))

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">URL do áudio</label>
        <input
          value={audioUrl}
          onChange={e => setAudioUrl(e.target.value)}
          placeholder="Cole a URL do áudio gerado pela Voz..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-accent"
        />
        <p className="text-[10px] text-zinc-600 mt-1">Funciona com MP3, WAV, M4A e outros formatos</p>
      </div>
      <div className="bg-zinc-800/60 rounded-xl p-3 text-xs text-zinc-500">
        Powered by <span className="text-white font-medium">Whisper</span> — transcrição em português com timestamps.
        Gera arquivo <span className="text-white">.srt</span> pronto para importar no editor de vídeo.
      </div>
      <button
        onClick={() => onGenerate({ audio_url: audioUrl })}
        disabled={!audioUrl.trim()}
        className="flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 w-full"
      >
        <Captions size={15} /> Gerar legenda — 1 crédito
      </button>
    </div>
  )
}
