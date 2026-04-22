'use client'

import { useState, useEffect } from 'react'
import { Video, Link2, User, Sparkles, Clapperboard } from 'lucide-react'
import ImageUpload from './ImageUpload'
import { CREDIT_COST } from '@/constants/studio'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

const AUDIO_EXTS = /\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i

function resolveImageUrl(params: Record<string, unknown>): string {
  const cont = String(params.continuation_frame ?? '')
  if (cont && !AUDIO_EXTS.test(cont)) return cont
  return String(params.source_image_url ?? '')
}

export default function VideoGenerator({ initial, onGenerate }: Props) {
  const isContinuation = !!initial.continuation_frame && !AUDIO_EXTS.test(String(initial.continuation_frame))
  const [imageUrl, setImageUrl] = useState(resolveImageUrl(initial))
  const [motion, setMotion] = useState(String(initial.motion_prompt ?? ''))
  const [duration, setDuration] = useState<5 | 10>(([5, 10].includes(Number(initial.duration)) ? Number(initial.duration) : 5) as 5 | 10)
  const [engine, setEngine] = useState(String(initial.engine ?? 'veo'))
  const [quality, setQuality] = useState(String(initial.quality ?? '720p'))

  useEffect(() => {
    const url = resolveImageUrl(initial)
    if (url) setImageUrl(url)
  }, [initial.source_image_url, initial.continuation_frame])

  const baseCost = engine === 'veo' ? CREDIT_COST.video_veo : CREDIT_COST.video
  const cost = quality === '1080p' ? baseCost * 2 : baseCost

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <div className="rounded-xl bg-blue-500/10 p-2">
          <Clapperboard size={16} className="text-blue-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-[12px] font-bold leading-tight text-white">Estudio de Animacao & Movimento</h4>
          <p className="text-[10px] leading-tight text-zinc-400">Anime uma foto com motor premium e configure movimento, resolucao e duracao no mesmo fluxo lateral.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-3">
          {!isContinuation ? (
            <ImageUpload value={imageUrl} onChange={setImageUrl} label="Imagem Fonte para Animador" accept="image/*" preview />
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-blue-300">
              <Link2 size={14} strokeWidth={3} /> Continuacao ativa do clipe anterior
            </div>
          )}

          <div className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
            <label className="block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Status</label>
            {initial.model_prompt && !isContinuation ? (
              <div className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                <User size={12} strokeWidth={3} /> Modelo conectado
              </div>
            ) : null}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-300">{engine === 'veo' ? 'Google Veo' : 'Kling AI'}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">
                {engine === 'veo' ? 'Ultra realismo para comerciais e tomadas cinematograficas.' : 'Fluidez maxima para clipes e cenas com movimento continuo.'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="space-y-2">
              <label className="block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Tecnologia</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setEngine('veo')}
                  className={`rounded-xl border px-2 py-3 text-[10px] font-bold transition-all ${
                    engine === 'veo' ? 'border-blue-500/40 bg-blue-500/15 text-blue-300' : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Google Veo
                </button>
                <button
                  onClick={() => setEngine('kling')}
                  className={`rounded-xl border px-2 py-3 text-[10px] font-bold transition-all ${
                    engine === 'kling' ? 'border-blue-500/40 bg-blue-500/15 text-blue-300' : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Kling AI
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Resolucao</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setQuality('720p')}
                  className={`rounded-xl border px-2 py-3 text-[10px] font-bold transition-all ${
                    quality === '720p' ? 'border-blue-500/40 bg-blue-500/15 text-blue-300' : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  720p
                </button>
                <button
                  onClick={() => setQuality('1080p')}
                  className={`rounded-xl border px-2 py-3 text-[10px] font-bold transition-all ${
                    quality === '1080p' ? 'border-amber-500/40 bg-amber-500/15 text-amber-300' : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  1080p HQ
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
            <label className="block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Direcao de movimento</label>
            <textarea
              value={motion}
              onChange={(e) => setMotion(e.target.value)}
              placeholder={
                isContinuation
                  ? 'Descreva a continuacao: a modelo agora olha para camera e sorri...'
                  : 'Ex: zoom lento no rosto, cabelo se movendo ao vento, a pessoa sorri e vira levemente...'
              }
              rows={5}
              className="w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-[12px] leading-relaxed text-white placeholder-zinc-700 shadow-inner transition-all focus:border-blue-500/40 focus:outline-none"
            />
          </div>

          <div className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
            <label className="block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Duracao do clipe</label>
            {engine === 'veo' ? (
              <div className="flex items-center justify-between rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-3 text-[11px] font-bold">
                <span className="text-blue-300">8 segundos</span>
                <span className="text-amber-400">max. 8s</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {[5, 10].map((seconds) => (
                  <button
                    key={seconds}
                    onClick={() => setDuration(seconds as 5 | 10)}
                    className={`rounded-xl border py-3 text-[10px] font-bold transition-all ${
                      duration === seconds ? 'border-blue-500/40 bg-blue-500/15 text-blue-300' : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() =>
              onGenerate({
                source_image_url: imageUrl,
                continuation_frame: isContinuation ? imageUrl : undefined,
                motion_prompt: motion,
                duration,
                engine,
                quality,
              })
            }
            disabled={!imageUrl.trim()}
            className={`group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-40 ${
              engine === 'veo'
                ? 'bg-gradient-to-r from-blue-700 to-indigo-700 shadow-[0_10px_30px_-10px_rgba(37,99,235,0.6)]'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-[0_10px_30px_-10px_rgba(37,99,235,0.4)]'
            }`}
          >
            <Video size={14} />
            {isContinuation ? `GERAR PROXIMO SEGMENTO - ${cost} CREDITOS` : `GERAR VIDEO - ${cost} CREDITOS`}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover/btn:animate-shimmer" />
          </button>
        </div>
      </div>
    </div>
  )
}
