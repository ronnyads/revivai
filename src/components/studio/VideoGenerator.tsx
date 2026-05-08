'use client'

import { useState } from 'react'
import { Video, Link2, User, Clapperboard, ChevronDown } from 'lucide-react'
import ImageUpload from './ImageUpload'
import {
  StudioFieldLabel,
  StudioFormShell,
  StudioPanel,
  StudioPrimaryButton,
} from './StudioFormShell'
import { STUDIO_ASPECT_RATIO_PRESETS } from './aspectRatio'
import {
  getVideoGenerationCost,
  normalizeStudioVideoQuality,
  type StudioVideoQuality,
} from '@/constants/studio'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

const AUDIO_EXTS = /\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i
const QUALITY_OPTIONS = [
  { value: '720p', label: '720p - 75 CR' },
  { value: '1080p', label: '1080p HQ - 100 CR' },
]
const VIDEO_FORMAT_OPTIONS = STUDIO_ASPECT_RATIO_PRESETS
  .filter((option) => option.value !== '1:1')
  .map((option) => ({
    value: option.value,
    label: `${option.label} - ${option.hint}`,
  }))
const VIDEO_SCENE_PRESETS = [
  { value: 'none', label: 'Sem preset', prompt: '' },
  { value: 'podcast', label: 'Podcast', prompt: 'estudio de podcast premium, microfone visivel, mesa clean, luz quente controlada, atmosfera intimista' },
  { value: 'beach', label: 'Praia', prompt: 'praia ensolarada, brisa suave, mar ao fundo, luz natural leve, atmosfera relaxada' },
  { value: 'office', label: 'Escritorio', prompt: 'escritorio contemporaneo, mesa organizada, luz suave de janela, atmosfera profissional premium' },
]

function normalizeVideoAspectRatio(value: unknown) {
  const normalized = String(value ?? '').trim()
  if (normalized === '4:5' || normalized === '16:9') return normalized
  return '9:16'
}

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
    duration: initial.duration ?? 8,
    quality: normalizeStudioVideoQuality(initial.quality),
    aspect_ratio: normalizeVideoAspectRatio(initial.aspect_ratio),
  })

  return <VideoGeneratorBody key={syncKey} initial={initial} onGenerate={onGenerate} />
}

function VideoGeneratorBody({ initial, onGenerate }: Props) {
  const isContinuation = !!initial.continuation_frame && !AUDIO_EXTS.test(String(initial.continuation_frame))
  const [imageUrl, setImageUrl] = useState(resolveImageUrl(initial))
  const [videoBrief, setVideoBrief] = useState(String(initial.motion_prompt ?? ''))
  const [quality, setQuality] = useState<StudioVideoQuality>(normalizeStudioVideoQuality(initial.quality))
  const [aspectRatio, setAspectRatio] = useState(normalizeVideoAspectRatio(initial.aspect_ratio))
  const [scenePreset, setScenePreset] = useState('none')
  const [sceneLivre, setSceneLivre] = useState(false)
  const duration = 8
  const selectedScenePreset = VIDEO_SCENE_PRESETS.find((option) => option.value === scenePreset) ?? VIDEO_SCENE_PRESETS[0]
  const selectedFormat = STUDIO_ASPECT_RATIO_PRESETS.find((option) => option.value === aspectRatio)
  const finalVideoBrief = joinPromptParts([selectedScenePreset.prompt, videoBrief])
  const cost = getVideoGenerationCost(quality)

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
        { label: sceneLivre ? 'Cena Livre' : 'Google Veo', tone: sceneLivre ? 'violet' : 'blue' },
        { label: selectedFormat?.label ?? aspectRatio, tone: 'neutral' },
        { label: `${quality} - ${cost} CR`, tone: quality === '1080p' ? 'warning' : 'neutral' },
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
                <p className="text-[10px] font-semibold text-white">Google Veo</p>
                <p className="mt-1 text-[9px] leading-relaxed text-white/44">
                  Segue melhor o briefing visual mantendo fidelidade da imagem-base.
                </p>
                <p className="mt-1 text-[9px] leading-relaxed text-white/34">
                  Se o brief incluir dialogo, este card usa fala nativa do Veo. Para audio exato ou lipsync externo, use Video com Fala.
                </p>
              </div>
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
                <div className="flex items-center justify-between rounded-[16px] border border-blue-500/18 bg-blue-500/10 px-3 py-2.5">
                  <span className="text-[10px] font-semibold text-blue-200">Google Veo</span>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/46">ativo</span>
                </div>
              </div>
              <div>
                <StudioFieldLabel>Qualidade</StudioFieldLabel>
                <CompactSelect value={quality} onChange={(value) => setQuality(normalizeStudioVideoQuality(value))} options={QUALITY_OPTIONS} />
              </div>
            </div>

            <div className="mt-3">
              <StudioFieldLabel>Formato de destino</StudioFieldLabel>
              <CompactSelect
                value={aspectRatio}
                onChange={setAspectRatio}
                options={VIDEO_FORMAT_OPTIONS}
              />
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
              <div className="flex items-center justify-between rounded-[16px] border border-blue-500/18 bg-blue-500/10 px-3 py-2.5">
                <span className="text-[10px] font-semibold text-blue-200">8 segundos</span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/46">fixo</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-[16px] border border-blue-500/14 bg-blue-500/[0.06] px-3 py-2.5">
              <span className="text-[10px] font-semibold text-blue-200">{selectedFormat?.label ?? 'Formato'}</span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/46">{cost} CR</span>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-[16px] border border-purple-500/20 bg-purple-500/10 px-3 py-2.5">
              <div>
                <p className="text-[10px] font-semibold text-purple-200">Cena Livre</p>
                <p className="text-[9px] text-white/44">Muda cena e roupa mantendo o modelo</p>
              </div>
              <button
                type="button"
                onClick={() => setSceneLivre((v) => !v)}
                className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${sceneLivre ? 'bg-purple-500' : 'bg-white/12'}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${sceneLivre ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </StudioPanel>

          <StudioPanel title="Brief" compact>
            <StudioFieldLabel>Brief do video</StudioFieldLabel>
            <textarea
              value={videoBrief}
              onChange={(event) => setVideoBrief(event.target.value)}
              placeholder="Ex: trocar para jaqueta preta, deixar a expressao mais confiante, camera aproximando devagar, ambiente noturno com luz neon. Para fala nativa, use uma secao DIALOGUE: com a frase."
              rows={3}
              className="w-full resize-none rounded-[18px] border border-white/8 bg-[#0B0D0F] px-3.5 py-3 text-[12px] leading-relaxed text-white outline-none transition-colors placeholder:text-white/24 focus:border-blue-400/30"
            />
            <p className="mt-2 text-[9px] leading-relaxed text-white/34">
              O card Video aceita roteiro com fala nativa do Veo quando voce escrever a fala no brief. Se precisar de voz externa ou lipsync exato, gere pelo card Video com Fala.
            </p>
          </StudioPanel>

          <StudioPrimaryButton
            accent="blue"
            disabled={!imageUrl.trim()}
            onClick={() =>
              onGenerate({
                source_image_url: imageUrl,
                continuation_frame: isContinuation ? imageUrl : undefined,
                motion_prompt: finalVideoBrief,
                duration,
                engine: 'veo',
                quality,
                aspect_ratio: aspectRatio,
                scene_livre: sceneLivre,
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
