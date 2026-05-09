'use client'

import { useState } from 'react'
import { Video, Link2, User, ChevronDown } from 'lucide-react'
import ImageUpload from './ImageUpload'
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

const VIDEO_FORMAT_OPTIONS = STUDIO_ASPECT_RATIO_PRESETS
  .filter((o) => o.value !== '1:1')
  .map((o) => ({ value: o.value, label: `${o.label} · ${o.hint}` }))

const VIDEO_SCENE_PRESETS = [
  { value: 'none',    label: 'Sem preset',  prompt: '' },
  { value: 'podcast', label: 'Podcast',     prompt: 'estudio de podcast premium, microfone visivel, mesa clean, luz quente controlada, atmosfera intimista' },
  { value: 'beach',   label: 'Praia',       prompt: 'praia ensolarada, brisa suave, mar ao fundo, luz natural leve, atmosfera relaxada' },
  { value: 'office',  label: 'Escritório',  prompt: 'escritorio contemporaneo, mesa organizada, luz suave de janela, atmosfera profissional premium' },
]

function normalizeVideoAspectRatio(value: unknown) {
  const v = String(value ?? '').trim()
  if (v === '4:5' || v === '16:9') return v
  return '9:16'
}

function joinPromptParts(parts: string[]) {
  return parts.map((p) => p.trim()).filter(Boolean).filter((p, i, a) => a.indexOf(p) === i).join(', ')
}

function resolveImageUrl(params: Record<string, unknown>): string {
  const cont = String(params.continuation_frame ?? '')
  if (cont && !AUDIO_EXTS.test(cont)) return cont
  return String(params.source_image_url ?? '')
}

function Select({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-[10px] border border-white/10 bg-[#0B0D0F] px-3 py-2 pr-8 text-[11px] text-white/88 outline-none transition-colors focus:border-white/20"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30" />
    </div>
  )
}

export default function VideoGenerator({ initial, onGenerate }: Props) {
  const syncKey = JSON.stringify({
    source_image_url: initial.source_image_url ?? '',
    continuation_frame: initial.continuation_frame ?? '',
    motion_prompt: initial.motion_prompt ?? '',
    quality: normalizeStudioVideoQuality(initial.quality),
    aspect_ratio: normalizeVideoAspectRatio(initial.aspect_ratio),
  })
  return <VideoBody key={syncKey} initial={initial} onGenerate={onGenerate} />
}

function VideoBody({ initial, onGenerate }: Props) {
  const isContinuation = !!initial.continuation_frame && !AUDIO_EXTS.test(String(initial.continuation_frame))
  const [imageUrl, setImageUrl]       = useState(resolveImageUrl(initial))
  const [brief, setBrief]             = useState(String(initial.motion_prompt ?? ''))
  const [quality, setQuality]         = useState<StudioVideoQuality>(normalizeStudioVideoQuality(initial.quality))
  const [aspectRatio, setAspectRatio] = useState(normalizeVideoAspectRatio(initial.aspect_ratio))
  const [scenePreset, setScenePreset] = useState('none')
  const [sceneLivre, setSceneLivre]   = useState(false)

  const selectedScene  = VIDEO_SCENE_PRESETS.find((o) => o.value === scenePreset) ?? VIDEO_SCENE_PRESETS[0]
  const selectedFormat = STUDIO_ASPECT_RATIO_PRESETS.find((o) => o.value === aspectRatio)
  const finalBrief     = joinPromptParts([selectedScene.prompt, brief])
  const cost           = getVideoGenerationCost(quality)
  const canGenerate    = isContinuation || imageUrl.trim().length > 0

  return (
    <div className="space-y-3 pt-1">

      {/* Fonte */}
      {!isContinuation ? (
        <ImageUpload value={imageUrl} onChange={setImageUrl} label="Imagem base" accept="image/*" preview compact />
      ) : (
        <div className="flex items-center gap-2 rounded-[10px] border border-blue-500/20 bg-blue-500/8 px-3 py-2 text-[10px] font-medium text-blue-200">
          <Link2 size={12} /> Continua o clipe anterior
        </div>
      )}

      {!!initial.model_prompt && !isContinuation && (
        <div className="flex items-center gap-2 rounded-[10px] border border-indigo-500/20 bg-indigo-500/8 px-3 py-2 text-[10px] font-medium text-indigo-200">
          <User size={12} /> Modelo conectado
        </div>
      )}

      {/* Formato + Qualidade */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/36">Formato</p>
          <Select value={aspectRatio} onChange={setAspectRatio} options={VIDEO_FORMAT_OPTIONS} />
        </div>
        <div>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/36">Qualidade</p>
          <Select
            value={quality}
            onChange={(v) => setQuality(normalizeStudioVideoQuality(v))}
            options={[
              { value: '720p',  label: '720p — 75 CR'     },
              { value: '1080p', label: '1080p — 100 CR'   },
            ]}
          />
        </div>
      </div>

      {/* Cenário */}
      <div>
        <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/36">Cenário</p>
        <Select value={scenePreset} onChange={setScenePreset} options={VIDEO_SCENE_PRESETS.map((o) => ({ value: o.value, label: o.label }))} />
      </div>

      {/* Brief */}
      <div>
        <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/36">Brief do vídeo</p>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={3}
          placeholder="Ação, cena, roupa, câmera... Para fala escreva DIALOGUE: frase"
          className="w-full resize-none rounded-[12px] border border-white/8 bg-[#0B0D0F] px-3 py-2.5 text-[11px] leading-relaxed text-white outline-none placeholder:text-white/22 focus:border-blue-400/28 transition-colors"
        />
      </div>

      {/* Cena Livre + meta */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setSceneLivre((v) => !v)}
          className={`flex items-center gap-1.5 rounded-[9px] border px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${
            sceneLivre
              ? 'border-purple-500/28 bg-purple-500/10 text-purple-200'
              : 'border-white/8 bg-white/[0.04] text-white/40'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full transition-colors ${sceneLivre ? 'bg-purple-400' : 'bg-white/20'}`} />
          Cena Livre
        </button>
        <span className="text-[9px] text-white/40">
          {selectedFormat?.hint ?? aspectRatio} · 8s · <span className="font-semibold text-white/60">{cost} CR</span>
        </span>
      </div>

      {/* Gerar */}
      <button
        type="button"
        disabled={!canGenerate}
        onClick={() =>
          onGenerate({
            source_image_url: imageUrl,
            continuation_frame: isContinuation ? imageUrl : undefined,
            motion_prompt: finalBrief,
            duration: 8,
            engine: 'veo',
            quality,
            aspect_ratio: aspectRatio,
            scene_livre: sceneLivre,
          })
        }
        className="flex w-full items-center justify-center gap-2 rounded-[13px] bg-blue-500 py-3 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-35"
      >
        <Video size={14} />
        {isContinuation ? `Próximo segmento — ${cost} CR` : `Gerar vídeo — ${cost} CR`}
      </button>
    </div>
  )
}
