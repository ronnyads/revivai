'use client'

import { useState } from 'react'
import { Video, Link2, User, Clapperboard } from 'lucide-react'
import ImageUpload from './ImageUpload'
import {
  StudioFieldLabel,
  StudioFormShell,
  StudioHint,
  StudioPanel,
  StudioPrimaryButton,
} from './StudioFormShell'
import { CREDIT_COST } from '@/constants/studio'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

const AUDIO_EXTS = /\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i

function resolveImageUrl(params: Record<string, unknown>): string {
  const continuation = String(params.continuation_frame ?? '')
  if (continuation && !AUDIO_EXTS.test(continuation)) return continuation
  return String(params.source_image_url ?? '')
}

export default function VideoGenerator({ initial, onGenerate }: Props) {
  const syncKey = JSON.stringify({
    source_image_url: initial.source_image_url ?? '',
    continuation_frame: initial.continuation_frame ?? '',
    motion_prompt: initial.motion_prompt ?? '',
    duration: initial.duration ?? 5,
    engine: initial.engine ?? 'veo',
    quality: initial.quality ?? '720p',
  })

  return <VideoGeneratorBody key={syncKey} initial={initial} onGenerate={onGenerate} />
}

function VideoGeneratorBody({ initial, onGenerate }: Props) {
  const isContinuation = !!initial.continuation_frame && !AUDIO_EXTS.test(String(initial.continuation_frame))
  const [imageUrl, setImageUrl] = useState(resolveImageUrl(initial))
  const [motion, setMotion] = useState(String(initial.motion_prompt ?? ''))
  const [duration, setDuration] = useState<5 | 10>(([5, 10].includes(Number(initial.duration)) ? Number(initial.duration) : 5) as 5 | 10)
  const [engine, setEngine] = useState(String(initial.engine ?? 'veo'))
  const [quality, setQuality] = useState(String(initial.quality ?? '720p'))

  const baseCost = engine === 'veo' ? CREDIT_COST.video_veo : CREDIT_COST.video
  const cost = quality === '1080p' ? baseCost * 2 : baseCost

  return (
    <StudioFormShell
      accent="blue"
      icon={<Clapperboard size={18} />}
      title={isContinuation ? 'Continuacao de video' : 'Video IA'}
      hideHeader
      layout="split"
      chips={[
        { label: engine === 'veo' ? 'Google Veo' : 'Kling AI', tone: 'blue' },
        { label: quality === '1080p' ? '1080p' : isContinuation ? 'Continuacao' : '720p', tone: quality === '1080p' ? 'warning' : 'neutral' },
      ]}
      media={
        <>
          <StudioPanel title="Base">
            {!isContinuation ? (
              <ImageUpload value={imageUrl} onChange={setImageUrl} label="Imagem fonte" accept="image/*" preview />
            ) : (
              <div className="flex items-center gap-2 rounded-[16px] border border-blue-500/20 bg-blue-500/10 px-3 py-2.5 text-[10px] font-semibold text-blue-200">
                <Link2 size={14} /> Continua o clipe anterior
              </div>
            )}
          </StudioPanel>

          <StudioPanel title="Origem">
            <div className="space-y-2">
              {initial.model_prompt && !isContinuation ? (
                <div className="flex items-center gap-2 rounded-[16px] border border-indigo-500/20 bg-indigo-500/10 px-3 py-2.5 text-[10px] font-semibold text-indigo-200">
                  <User size={14} /> Modelo conectado
                </div>
              ) : null}
              <div className="rounded-[16px] border border-blue-500/14 bg-blue-500/[0.06] px-3 py-2.5">
                <p className="text-[10px] font-semibold text-white">{engine === 'veo' ? 'Google Veo' : 'Kling AI'}</p>
                <p className="mt-1 text-[9px] leading-relaxed text-white/44">
                  {engine === 'veo' ? 'Mais cinematografico.' : 'Melhor para sequencia e repeticao.'}
                </p>
              </div>
            </div>
          </StudioPanel>
        </>
      }
      controls={
        <>
          <StudioPanel title="Motor">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <StudioFieldLabel>Tecnologia</StudioFieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'veo', label: 'Google Veo' },
                    { value: 'kling', label: 'Kling AI' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setEngine(option.value)}
                      className={`rounded-[16px] border px-3 py-2.5 text-[10px] font-semibold transition-all ${
                        engine === option.value
                          ? 'border-blue-400/30 bg-blue-500/12 text-white'
                          : 'border-white/8 bg-[#0B0D0F] text-white/46 hover:border-white/14 hover:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <StudioFieldLabel>Resolucao</StudioFieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: '720p', label: '720p' },
                    { value: '1080p', label: '1080p HQ' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setQuality(option.value)}
                      className={`rounded-[16px] border px-3 py-2.5 text-[10px] font-semibold transition-all ${
                        quality === option.value
                          ? 'border-blue-400/30 bg-blue-500/12 text-white'
                          : 'border-white/8 bg-[#0B0D0F] text-white/46 hover:border-white/14 hover:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </StudioPanel>

          <StudioPanel title="Movimento">
            <StudioFieldLabel>Direcao de movimento</StudioFieldLabel>
            <textarea
              value={motion}
              onChange={(event) => setMotion(event.target.value)}
              placeholder={
                isContinuation
                  ? 'Ex: olha para a camera, sorri de leve, respiracao natural.'
                  : 'Ex: leve push-in, sorriso suave, pequeno giro de rosto, levantar levemente o produto.'
              }
              rows={4}
              className="w-full resize-none rounded-[18px] border border-white/8 bg-[#0B0D0F] px-3.5 py-3 text-[12px] leading-relaxed text-white outline-none transition-colors placeholder:text-white/24 focus:border-blue-400/30"
            />
            <div className="mt-2 space-y-1.5">
              <StudioHint>
                Use este campo para micro-movimento, expressao e camera. O video preserva modelo, produto, roupa e fundo do frame base.
              </StudioHint>
              <StudioHint tone="warning">
                Nao troca cenario aqui. Para ambiente novo, use Cena Livre e depois anime o frame final em Video.
              </StudioHint>
            </div>
          </StudioPanel>

          <StudioPanel title="Duracao">
            {engine === 'veo' ? (
              <div className="flex items-center justify-between rounded-[16px] border border-blue-500/18 bg-blue-500/10 px-3 py-2.5">
                <span className="text-[10px] font-semibold text-blue-200">8 segundos</span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/46">fixo</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {[5, 10].map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    onClick={() => setDuration(seconds as 5 | 10)}
                    className={`rounded-[16px] border px-3 py-2.5 text-[10px] font-semibold transition-all ${
                      duration === seconds
                        ? 'border-blue-400/30 bg-blue-500/12 text-white'
                        : 'border-white/8 bg-[#0B0D0F] text-white/46 hover:border-white/14 hover:text-white'
                    }`}
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
            )}
          </StudioPanel>

          <StudioPrimaryButton
            accent="blue"
            disabled={!imageUrl.trim()}
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
          >
            <Video size={16} />
            {isContinuation ? `Gerar proximo segmento - ${cost} CR` : `Gerar video - ${cost} CR`}
          </StudioPrimaryButton>
        </>
      }
    />
  )
}
