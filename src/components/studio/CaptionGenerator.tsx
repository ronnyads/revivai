'use client'

import { useState } from 'react'
import { Captions } from 'lucide-react'
import ImageUpload from './ImageUpload'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function CaptionGenerator({ initial, onGenerate }: Props) {
  const [audioUrl, setAudioUrl] = useState(String(initial.audio_url ?? ''))

  return (
    <div className="flex flex-col gap-3">
      <ImageUpload
        value={audioUrl}
        onChange={setAudioUrl}
        label="Áudio (do computador ou gerado pela Voz)"
        accept="audio/*"
        preview={false}
      />
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
