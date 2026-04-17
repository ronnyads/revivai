'use client'

import { useState, useEffect } from 'react'
import { Video, Link2, User } from 'lucide-react'
import ImageUpload from './ImageUpload'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

// Ignora continuation_frame se for áudio (conexão errada de Voz → Vídeo)
const AUDIO_EXTS = /\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i

function resolveImageUrl(params: Record<string, unknown>): string {
  const cont = String(params.continuation_frame ?? '')
  if (cont && !AUDIO_EXTS.test(cont)) return cont
  return String(params.source_image_url ?? '')
}

export default function VideoGenerator({ initial, onGenerate }: Props) {
  const isContinuation = !!initial.continuation_frame && !AUDIO_EXTS.test(String(initial.continuation_frame))
  const [imageUrl, setImageUrl] = useState(resolveImageUrl(initial))
  const [motion,   setMotion]   = useState(String(initial.motion_prompt ?? ''))
  const [duration, setDuration] = useState(Number(initial.duration      ?? 5))
  const [engine,   setEngine]   = useState(String(initial.engine        ?? 'veo'))

  // Sync quando conexão do canvas preenche source_image_url ou continuation_frame
  useEffect(() => {
    const url = resolveImageUrl(initial)
    if (url) setImageUrl(url)
  }, [initial.source_image_url, initial.continuation_frame])

  return (
    <div className="flex flex-col gap-3">
      {isContinuation ? (
        <div className="flex items-center gap-2 text-[11px] text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2.5 py-2 rounded-xl">
          <Link2 size={12} />
          <span>Continuando do clipe anterior</span>
        </div>
      ) : (
        <ImageUpload
          value={imageUrl}
          onChange={setImageUrl}
          label="Imagem base (da galeria ou computador)"
          accept="image/*"
          preview
        />
      )}
      {!!initial.model_prompt && (
        <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1.5 rounded-xl">
          <User size={11} /> Modelo conectado
        </div>
      )}
      <div>
        <div className="flex items-center gap-2 mb-3 bg-blue-500/10 border border-blue-500/30 rounded-xl px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-blue-400 shrink-0"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 100-16 8 8 0 000 16zm-1-5h2v2h-2v-2zm0-8h2v6h-2V7z" fill="currentColor"/></svg>
          <span className="text-[11px] text-blue-300 font-medium">Google Veo 3.1 — Motor ativo</span>
        </div>

        <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">
          {isContinuation ? 'Movimento deste segmento' : 'Descrição do movimento'}
        </label>
        <textarea
          value={motion}
          onChange={e => setMotion(e.target.value)}
          placeholder={isContinuation
            ? 'Descreva a continuação do movimento...'
            : 'Ex: câmera suave girando ao redor do produto...'}
          rows={4}
          className="w-full bg-zinc-800 border border-zinc-700/60 rounded-xl px-3.5 py-3 text-[13px] text-white placeholder-zinc-500 resize-y focus:outline-none focus:border-zinc-500 transition-colors"
        />
      </div>
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Duração: {duration}s</label>
        <input
          type="range" min="3" max="10" step="1"
          value={duration}
          onChange={e => setDuration(Number(e.target.value))}
          className="w-full accent-accent"
        />
      </div>
      <div className="bg-zinc-800/60 rounded-xl p-3 text-xs text-zinc-500">
        Motor: <span className="text-white font-medium">Google Veo 3.1</span> — Realismo fílmico puro. Geração leva 2–5 min.
      </div>
      <button
        onClick={() => onGenerate({
          source_image_url: imageUrl,
          continuation_frame: isContinuation ? imageUrl : undefined,
          motion_prompt: motion,
          duration,
          engine,
        })}
        disabled={!imageUrl.trim()}
        className="flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 w-full"
      >
        <Video size={15} /> {isContinuation ? 'Gerar segmento' : 'Gerar vídeo'} — {engine === 'veo' ? '100' : '15'} créditos
      </button>
    </div>
  )
}
