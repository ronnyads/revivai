'use client'

import { useState, useEffect } from 'react'
import { Video, Link2, User } from 'lucide-react'
import ImageUpload from './ImageUpload'
import { CREDIT_COST } from '@/constants/studio'

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
  const [quality,  setQuality]  = useState(String(initial.quality       ?? '720p'))

  // Sync quando conexão do canvas preenche source_image_url ou continuation_frame
  useEffect(() => {
    const url = resolveImageUrl(initial)
    if (url) setImageUrl(url)
  }, [initial.source_image_url, initial.continuation_frame])

  // Custo dinâmico baseado no motor e na QUALIDADE selecionada
  const baseCost = engine === 'veo' ? CREDIT_COST['video_veo'] : CREDIT_COST['video']
  const cost = quality === '1080p' ? baseCost * 2 : baseCost

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho de Explicação */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-blue-500/20 rounded-xl mt-0.5">
          <Video size={18} className="text-blue-400" />
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-white leading-tight">Estúdio de Animação & Movimento</h4>
          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
            Dê vida às suas fotos. Escolha entre o realismo cinematográfico do <b>Google Veo</b> ou a fluidez do <b>Kling AI</b>.
          </p>
        </div>
      </div>

      {/* Seletor de Motor */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Tecnologia de Vídeo</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setEngine('veo')}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${
              engine === 'veo' 
                ? 'bg-blue-500/20 border-blue-500/50 ring-1 ring-blue-500/20' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
            }`}
          >
            <span className={`text-[11px] font-bold ${engine === 'veo' ? 'text-white' : 'text-zinc-400'}`}>Google Veo</span>
            <span className="text-[8px] uppercase tracking-tighter">Ultra Realismo</span>
          </button>
          <button
            onClick={() => setEngine('kling')}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${
              engine === 'kling' 
                ? 'bg-blue-500/20 border-blue-500/50 ring-1 ring-blue-500/20' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
            }`}
          >
            <span className={`text-[11px] font-bold ${engine === 'kling' ? 'text-white' : 'text-zinc-400'}`}>Kling AI</span>
            <span className="text-[8px] uppercase tracking-tighter">Fluidez Máxima</span>
          </button>
        </div>
      </div>

      {/* Seletor de Qualidade */}
      <div className="flex flex-col gap-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-3">
        <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1">Resolução do Vídeo</label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            onClick={() => setQuality('720p')}
            className={`flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-bold transition-all border ${
              quality === '720p' ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-transparent border-transparent text-zinc-600 hover:text-zinc-400'
            }`}
          >
            720p HD
          </button>
          <button
            onClick={() => setQuality('1080p')}
            className={`flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-bold transition-all border ${
              quality === '1080p' ? 'bg-zinc-800 border-zinc-700 text-white shadow-lg' : 'bg-transparent border-transparent text-zinc-600 hover:text-zinc-400'
            }`}
          >
            1080p <span className="text-[8px] font-black text-amber-500">HQ</span>
          </button>
        </div>
      </div>

      {!isContinuation && (
        <ImageUpload
          value={imageUrl}
          onChange={setImageUrl}
          label="Imagem Fonte para Animador"
          accept="image/*"
          preview
        />
      )}

      {isContinuation ? (
        <div className="flex items-center gap-3 text-[10px] uppercase font-bold tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/30 px-4 py-3 rounded-2xl">
          <Link2 size={14} strokeWidth={3} /> Continuação Ativa do Clipe Anterior
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
           {!!initial.model_prompt && (
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-3 py-2 rounded-xl">
              <User size={12} strokeWidth={3} /> Modelo Conectado
            </div>
          )}
        </div>
      )}

      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Direção de Movimento</label>
        </div>
        <textarea
          value={motion}
          onChange={e => setMotion(e.target.value)}
          placeholder={isContinuation
            ? "Descreva a continuação: 'A modelo agora olha para a câmera e sorri'..."
            : "Ex: 'Zoom lento no rosto', 'Modelo mexendo o cabelo e sorrindo'..."}
          rows={5}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-[13px] text-white placeholder-zinc-700 focus:outline-none focus:border-blue-500/40 transition-all leading-relaxed shadow-inner resize-none"
        />
      </div>

      <div className="space-y-2.5 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-center justify-between px-1">
          <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Duração do Clipe</label>
          <span className={`text-[11px] font-black ${engine === 'veo' ? 'text-zinc-400' : 'text-blue-400'}`}>
            {engine === 'veo' ? '8s (Fixo Google)' : `${duration} Segundos`}
          </span>
        </div>
        {engine !== 'veo' && (
          <div className="px-1">
            <input
              type="range" 
              min="3" 
              max="10" 
              step="1"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        )}
      </div>

      <button
        onClick={() => onGenerate({
          source_image_url: imageUrl,
          continuation_frame: isContinuation ? imageUrl : undefined,
          motion_prompt: motion,
          duration: duration,
          engine,
          quality,
        })}
        disabled={!imageUrl.trim()}
        className={`group relative flex items-center justify-center gap-2 text-white text-[13px] font-bold py-4 rounded-2xl transition-all disabled:opacity-40 w-full mt-2 overflow-hidden active:scale-[0.98] ${
          engine === 'veo' 
            ? 'bg-gradient-to-r from-blue-700 to-indigo-700 shadow-[0_10px_30px_-10px_rgba(37,99,235,0.6)]' 
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-[0_10px_30px_-10px_rgba(37,99,235,0.4)]'
        }`}
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Video size={18} className="group-hover:scale-110 transition-transform" /> 
        {isContinuation ? `GERAR PRÓXIMO SEGMENTO — ${cost} CRÉDITOS` : `GERAR VÍDEO ${engine === 'veo' ? 'PREMIUM' : 'CINEMÁTICO'} — ${cost} CRÉDITOS`}
      </button>
    </div>
  )
}
