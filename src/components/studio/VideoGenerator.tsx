'use client'

import { useState } from 'react'
import { Video, Link2, User, Clapperboard, ChevronDown } from 'lucide-react'
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
const ENGINE_OPTIONS = [
  { value: 'veo', label: 'Google Veo' },
  { value: 'kling', label: 'Kling AI' },
]
const QUALITY_OPTIONS = [
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p HQ' },
]
const DURATION_OPTIONS = [
  { value: '5', label: '5 segundos' },
  { value: '10', label: '10 segundos' },
]
const VIDEO_SCENE_PRESETS = [
  { value: 'none', label: 'Sem preset', prompt: '' },
  { value: 'podcast', label: 'Podcast', prompt: 'estudio de podcast premium, microfone visivel, mesa clean, luz quente controlada, atmosfera intimista' },
  { value: 'beach', label: 'Praia', prompt: 'praia ensolarada, brisa suave, mar ao fundo, luz natural leve, atmosfera relaxada' },
  { value: 'office', label: 'Escritorio', prompt: 'escritorio contemporaneo, mesa organizada, luz suave de janela, atmosfera profissional premium' },
]

function joinPromptParts(parts: string[]) {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part, index, array) => array.indexOf(part) === index)
    .join(', ')
}

function CompactSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-[16px] border border-white/8 bg-[#0B0D0F] px-3 py-2.5 pr-9 text-[11px] text-white outline-none transition-colors focus:border-blue-400/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/38" />
    </div>
  )
}

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
  const [scenePreset, setScenePreset] = useState('none')
  const selectedEngineLabel = ENGINE_OPTIONS.find((option) => option.value === engine)?.label ?? 'Motor'
  const selectedScenePreset = VIDEO_SCENE_PRESETS.find((option) => option.value === scenePreset) ?? VIDEO_SCENE_PRESETS[0]
  const finalMotionPrompt = joinPromptParts([selectedScenePreset.prompt, motion])

  const baseCost = engine === 'veo' ? CREDIT_COST.video_veo : CREDIT_COST.video
  const cost = quality === '1080p' ? baseCost * 2 : baseCost

  return (
    <StudioFormShell
      accent="blue"
      icon={<Clapperboard size={18} />}
      title={isContinuation ? 'Continuacao de video' : 'Video IA'}
      hideHeader
      layout="split"
      contentClassName="gap-2.5"
      mediaColumnClassName="space-y-2.5"
      controlsColumnClassName="space-y-2.5"
      chips={[
        { label: engine === 'veo' ? 'Google Veo' : 'Kling AI', tone: 'blue' },
        { label: quality === '1080p' ? '1080p' : isContinuation ? 'Continuacao' : '720p', tone: quality === '1080p' ? 'warning' : 'neutral' },
      ]}
      media={
        <>
          <StudioPanel title="Base" compact>
            {!isContinuation ? (
              <ImageUpload value={imageUrl} onChange={setImageUrl} label="Imagem fonte" accept="image/*" preview compact />
            ) : (
              <div className="flex items-center gap-2 rounded-[16px] border border-blue-500/20 bg-blue-500/10 px-3 py-2.5 text-[10px] font-semibold text-blue-200">
                <Link2 size={14} /> Continua o clipe anterior
              </div>
            )}
          </StudioPanel>

          <StudioPanel title="Origem" compact>
            <div className="space-y-2">
              {initial.model_prompt && !isContinuation ? (
                <div className="flex items-center gap-2 rounded-[16px] border border-indigo-500/20 bg-indigo-500/10 px-3 py-2.5 text-[10px] font-semibold text-indigo-200">
                  <User size={14} /> Modelo conectado
                </div>
              ) : null}
              <div className="rounded-[16px] border border-blue-500/14 bg-blue-500/[0.06] px-3 py-2.5">
                <p className="text-[10px] font-semibold text-white">{selectedEngineLabel}</p>
                <p className="mt-1 text-[9px] leading-relaxed text-white/44">
                  {engine === 'veo' ? 'Mais cinematografico.' : 'Melhor para sequencia e repeticao.'}
                </p>
              </div>
              <StudioHint>Imagem base e cenario do frame ficam travados por padrao.</StudioHint>
            </div>
          </StudioPanel>
        </>
      }
      controls={
        <>
          <StudioPanel title="Configuracao" compact>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <StudioFieldLabel>Tecnologia</StudioFieldLabel>
                <CompactSelect value={engine} onChange={setEngine} options={ENGINE_OPTIONS} />
              </div>
              <div>
                <StudioFieldLabel>Resolucao</StudioFieldLabel>
                <CompactSelect value={quality} onChange={setQuality} options={QUALITY_OPTIONS} />
              </div>
            </div>

            <div className="mt-3">
              <StudioFieldLabel>Cenario preset</StudioFieldLabel>
              <CompactSelect
                value={scenePreset}
                onChange={setScenePreset}
                options={VIDEO_SCENE_PRESETS.map((option) => ({ value: option.value, label: option.label }))}
              />
            </div>

            <div className="mt-3">
              <StudioFieldLabel>Duracao</StudioFieldLabel>
              {engine === 'veo' ? (
                <div className="flex items-center justify-between rounded-[16px] border border-blue-500/18 bg-blue-500/10 px-3 py-2.5">
                  <span className="text-[10px] font-semibold text-blue-200">8 segundos</span>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/46">fixo</span>
                </div>
              ) : (
                <CompactSelect
                  value={String(duration)}
                  onChange={(value) => setDuration(Number(value) as 5 | 10)}
                  options={DURATION_OPTIONS}
                />
              )}
            </div>

            <div className="mt-3 flex items-center justify-between rounded-[16px] border border-blue-500/14 bg-blue-500/[0.06] px-3 py-2.5">
              <span className="text-[10px] font-semibold text-blue-200">{selectedEngineLabel}</span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/46">{cost} CR</span>
            </div>
            <div className="mt-2">
              <StudioHint>
                {selectedScenePreset.value !== 'none'
                  ? 'Preset ativo. O Studio prepara a pre-cena antes de animar.'
                  : 'Sem preset, o video preserva o frame base e trabalha o movimento.'}
              </StudioHint>
            </div>
          </StudioPanel>

          <StudioPanel title="Movimento" compact>
            <StudioFieldLabel>Direcao de movimento</StudioFieldLabel>
            <textarea
              value={motion}
              onChange={(event) => setMotion(event.target.value)}
              placeholder={
                isContinuation
                  ? 'Ex: olha para a camera, sorri de leve, respiracao natural.'
                  : 'Ex: leve push-in, sorriso suave, pequeno giro de rosto, levantar levemente o produto.'
              }
              rows={2}
              className="w-full resize-none rounded-[18px] border border-white/8 bg-[#0B0D0F] px-3.5 py-3 text-[12px] leading-relaxed text-white outline-none transition-colors placeholder:text-white/24 focus:border-blue-400/30"
            />
            <div className="mt-2 space-y-1.5">
              <StudioHint>Use este campo para gesto, expressao e camera. Modelo, produto, roupa e fundo ficam presos ao frame base.</StudioHint>
              <StudioHint tone="warning">
                Se pedir ambiente novo, o Studio precisa reinterpretar a cena antes de animar.
              </StudioHint>
            </div>
          </StudioPanel>

          <StudioPrimaryButton
            accent="blue"
            disabled={!imageUrl.trim()}
            onClick={() =>
              onGenerate({
                source_image_url: imageUrl,
                continuation_frame: isContinuation ? imageUrl : undefined,
                motion_prompt: finalMotionPrompt,
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
