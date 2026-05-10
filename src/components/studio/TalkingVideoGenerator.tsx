'use client'

import { useMemo, useState } from 'react'
import { Clapperboard, ChevronDown, Loader2, Mic, Sparkles } from 'lucide-react'
import ImageUpload from './ImageUpload'
import { STUDIO_ASPECT_RATIO_PRESETS } from './aspectRatio'
import VoiceLibraryPicker from './VoiceLibraryPicker'
import {
  buildTalkingVideoIdeaFromParts,
  calculateTalkingVideoCredits,
  estimateTalkingSpeechDurationSeconds,
  planTalkingVideoSpeechChunk,
  parseTalkingVideoIdeaInput,
  type TalkingVideoAudioSource,
} from '@/lib/talkingVideoIdea'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

type TalkingVideoMode = 'exact_speech' | 'veo_natural'
type ScenePresetId    = 'none' | 'podcast' | 'beach' | 'office'

const SCENE_PRESETS = [
  { id: 'none'    as ScenePresetId, label: 'Cena livre',  shortLabel: 'Cena livre',  description: 'Cena aberta para sua direção.', prompt: '' },
  { id: 'podcast' as ScenePresetId, label: 'Podcast',     shortLabel: 'Podcast',     description: 'Estúdio com microfone, luz quente e clima intimista.', prompt: 'estudio de podcast premium, microfone visivel, mesa clean, luz quente controlada, enquadramento meio corpo, atmosfera intimista' },
  { id: 'beach'   as ScenePresetId, label: 'Praia',       shortLabel: 'Praia',       description: 'Litoral ensolarado, vento leve, fim de tarde.', prompt: 'praia ensolarada, brisa suave, mar ao fundo, luz de fim de tarde, atmosfera leve, enquadramento natural' },
  { id: 'office'  as ScenePresetId, label: 'Escritório',  shortLabel: 'Escritório',  description: 'Ambiente corporativo clean, luz suave e profissional.', prompt: 'escritorio contemporaneo, mesa organizada, luz suave de janela, atmosfera corporativa premium, enquadramento profissional' },
]

function joinPromptParts(parts: string[]) {
  return parts.map((p) => p.trim()).filter(Boolean).filter((p, i, a) => a.indexOf(p) === i).join(', ')
}

function getEstimateTone(s: number) {
  if (s <= 6.6) return 'safe'
  if (s <= 7.8) return 'warning'
  return 'danger'
}

function getInitialIdeaPrompt(initial: Record<string, unknown>) {
  const saved = typeof initial.idea_prompt === 'string' ? initial.idea_prompt : ''
  if (saved.trim()) return saved
  return buildTalkingVideoIdeaFromParts({
    speechText:          typeof initial.speech_text          === 'string' ? initial.speech_text          : '',
    expressionDirection: typeof initial.expression_direction === 'string' ? initial.expression_direction : '',
    visualPrompt:        typeof initial.visual_prompt        === 'string' ? initial.visual_prompt        : '',
  })
}

function getInitialScenePreset(initial: Record<string, unknown>): ScenePresetId {
  const saved = String(initial.scene_preset_id ?? '').trim().toLowerCase()
  if (saved === 'podcast' || saved === 'beach' || saved === 'office') return saved
  const seed = `${String(initial.idea_prompt ?? '')} ${String(initial.visual_prompt ?? '')}`.toLowerCase()
  if (/(podcast|microfone)/.test(seed)) return 'podcast'
  if (/(praia|mar|areia|litoral)/.test(seed)) return 'beach'
  if (/(escritorio|office|corporativ)/.test(seed)) return 'office'
  return 'none'
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-[10px] border border-white/10 bg-[#0B0D0F] px-3 py-2 pr-8 text-[11px] text-white/88 outline-none transition-colors focus:border-cyan-400/28"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30" />
    </div>
  )
}

export default function TalkingVideoGenerator({ initial, onGenerate }: Props) {
  const syncKey = JSON.stringify({
    source_image_url:    initial.source_image_url    ?? '',
    talking_video_mode:  initial.talking_video_mode  ?? 'exact_speech',
    idea_prompt:         initial.idea_prompt         ?? '',
    speech_text:         initial.speech_text         ?? '',
    expression_direction:initial.expression_direction?? '',
    visual_prompt:       initial.visual_prompt       ?? '',
    quality:             initial.quality             ?? '720p',
    aspect_ratio:        initial.aspect_ratio        ?? '9:16',
    audio_url:           initial.audio_url           ?? '',
  })
  return <TalkingVideoBody key={syncKey} initial={initial} onGenerate={onGenerate} />
}

function TalkingVideoBody({ initial, onGenerate }: Props) {
  const savedIdeaPrompt    = getInitialIdeaPrompt(initial)
  const hasSavedIdeaPrompt = savedIdeaPrompt.trim().length > 0

  const [imageUrl, setImageUrl]       = useState(String(initial.source_image_url ?? ''))
  const [mode, setMode]               = useState<TalkingVideoMode>(
    String(initial.talking_video_mode ?? 'exact_speech') === 'veo_natural' ? 'veo_natural' : 'exact_speech'
  )
  const [ideaPrompt, setIdeaPrompt]         = useState(savedIdeaPrompt)
  const [speechOverride, setSpeechOverride] = useState(() => {
    const raw = String(initial.speech_text_input_raw ?? '')
    if (raw.trim()) return raw
    return hasSavedIdeaPrompt ? '' : String(initial.speech_text ?? '')
  })
  const [expressionOverride, setExpressionOverride] = useState(() => {
    const raw = String(initial.expression_direction_input_raw ?? '')
    if (raw.trim()) return raw
    return hasSavedIdeaPrompt ? '' : String(initial.expression_direction ?? '')
  })
  const [visualOverride, setVisualOverride] = useState(() => {
    const raw = String(initial.visual_prompt_input_raw ?? '')
    if (raw.trim()) return raw
    return hasSavedIdeaPrompt ? '' : String(initial.visual_prompt ?? '')
  })
  const [quality, setQuality]         = useState(String(initial.quality ?? '720p'))
  const [aspectRatio, setAspectRatio] = useState(String(initial.aspect_ratio ?? '9:16'))
  const [scenePresetId, setScenePresetId] = useState<ScenePresetId>(getInitialScenePreset(initial))
  const [advancedOpen, setAdvancedOpen]   = useState(false)
  const [loading, setLoading]             = useState(false)
  const [voiceId, setVoiceId]             = useState(String(initial.voice_id ?? 'EXAVITQu4vr4xnSDxMaL'))
  const speed = 1.0

  const scenePreset = useMemo(() => SCENE_PRESETS.find((p) => p.id === scenePresetId) ?? SCENE_PRESETS[0], [scenePresetId])

  const parsedIdeaBase = useMemo(() =>
    parseTalkingVideoIdeaInput({ mode, ideaPrompt, speechText: speechOverride, expressionDirection: expressionOverride, visualPrompt: visualOverride }),
    [mode, ideaPrompt, speechOverride, expressionOverride, visualOverride]
  )

  const resolvedVisualPrompt = useMemo(
    () => joinPromptParts([scenePreset.prompt, parsedIdeaBase.visualPrompt]),
    [scenePreset.prompt, parsedIdeaBase.visualPrompt]
  )

  const parsedIdea = useMemo(() => ({
    ...parsedIdeaBase,
    visualPrompt: resolvedVisualPrompt,
    sceneDetected: resolvedVisualPrompt.length > 0,
  }), [parsedIdeaBase, resolvedVisualPrompt])

  const estimateSeconds  = useMemo(() => estimateTalkingSpeechDurationSeconds({ text: parsedIdea.speechText, speed }), [parsedIdea.speechText, speed])
  const chunkPlan        = useMemo(() => planTalkingVideoSpeechChunk({ text: parsedIdea.speechText, speed, targetSeconds: 7.35, maxSeconds: 7.95 }), [parsedIdea.speechText, speed])
  const speechWillContinue = mode === 'exact_speech' && chunkPlan.hasRemaining
  const estimateTone       = getEstimateTone(speechWillContinue ? chunkPlan.selectedSeconds : estimateSeconds)

  const hasExternalAudio = String(initial.audio_url ?? '').trim().length > 0
  const audioSource: TalkingVideoAudioSource = hasExternalAudio ? 'connected_audio' : mode === 'veo_natural' ? 'veo_native' : 'generated_tts'
  const cost = calculateTalkingVideoCredits({ quality, audioSource })

  const exactSpeechMissing = mode === 'exact_speech' && !parsedIdea.speechDetected
  const naturalMissing     = !imageUrl.trim() || (!parsedIdea.speechDetected && !parsedIdea.sceneDetected)
  const isDisabled         = loading || (mode === 'exact_speech' ? !imageUrl.trim() || exactSpeechMissing : naturalMissing)

  const ctaLabel = mode === 'exact_speech'
    ? `Gerar frase exata — ${cost} CR`
    : hasExternalAudio
      ? `Gerar Veo + lipsync — ${cost} CR`
      : `Gerar Veo natural — ${cost} CR`

  const durationBadge = mode === 'exact_speech' && parsedIdea.speechDetected
    ? speechWillContinue
      ? `${chunkPlan.selectedSeconds.toFixed(1)}s · parte 1`
      : `${estimateSeconds.toFixed(1)}s`
    : null

  return (
    <div className="space-y-3 pt-1">

      {/* Modo — selector de pill */}
      <div className="grid grid-cols-2 gap-1.5">
        {(['exact_speech', 'veo_natural'] as TalkingVideoMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex items-center justify-center gap-1.5 rounded-[10px] border py-2 text-[10px] font-semibold transition-colors ${
              mode === m
                ? m === 'exact_speech'
                  ? 'border-cyan-500/30 bg-cyan-500/12 text-cyan-200'
                  : 'border-amber-500/28 bg-amber-500/10 text-amber-200'
                : 'border-white/8 bg-white/[0.03] text-white/40 hover:text-white/60'
            }`}
          >
            {m === 'exact_speech' ? <Mic size={11} /> : <Sparkles size={11} />}
            {m === 'exact_speech' ? 'Frase exata' : 'Veo natural'}
          </button>
        ))}
      </div>

      {/* Imagem fonte */}
      <ImageUpload value={imageUrl} onChange={setImageUrl} label="Imagem base" accept="image/*" preview compact />

      {/* Ideia completa */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/36">
            {mode === 'exact_speech' ? 'Fala + direção visual' : 'Ideia completa'}
          </p>
          {durationBadge && (
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
              estimateTone === 'safe'
                ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                : 'border border-amber-500/20 bg-amber-500/10 text-amber-300'
            }`}>
              {durationBadge}
            </span>
          )}
        </div>
        <textarea
          value={ideaPrompt}
          onChange={(e) => setIdeaPrompt(e.target.value)}
          rows={4}
          placeholder={mode === 'exact_speech'
            ? `"Esse produto mudou minha vida!"\n\nmulher sorrindo, luz natural, olhando para câmera`
            : `Mulher caminhando em parque outono,\ntom íntimo, olhando para câmera`}
          className="w-full resize-none rounded-[12px] border border-white/8 bg-[#0B0D0F] px-3 py-2.5 text-[11px] leading-relaxed text-white outline-none placeholder:text-white/22 focus:border-cyan-400/28 transition-colors"
        />
      </div>

      {/* Voz (apenas exact_speech sem áudio externo) */}
      {mode === 'exact_speech' && !hasExternalAudio && (
        <div>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/36">Voz</p>
          <VoiceLibraryPicker
            value={voiceId}
            onChange={setVoiceId}
            accentClass="cyan"
            showCloneUpload={false}
          />
        </div>
      )}

      {/* Áudio + Cenário */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/36">Áudio</p>
          <Select
            value={mode}
            onChange={(v) => setMode(v as TalkingVideoMode)}
            options={[
              { value: 'exact_speech', label: 'TTS + Lipsync' },
              { value: 'veo_natural',  label: 'Veo nativo'    },
            ]}
          />
        </div>
        <div>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/36">Cenário</p>
          <Select
            value={scenePresetId}
            onChange={(v) => setScenePresetId(v as ScenePresetId)}
            options={SCENE_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
          />
        </div>
      </div>

      {/* Avançado — collapsible */}
      <div>
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-[10px] border border-white/8 bg-white/[0.03] px-3 py-2 text-[10px] font-semibold text-white/46 transition-colors hover:text-white/60"
        >
          <span>Avançado</span>
          <ChevronDown size={12} className={`transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
        </button>

        {advancedOpen && (
          <div className="mt-2 space-y-2">
            <div>
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/30">Fala exata</p>
              <textarea
                value={speechOverride}
                onChange={(e) => setSpeechOverride(e.target.value)}
                placeholder={parsedIdea.speechText || 'Override da fala detectada'}
                rows={2}
                className="w-full resize-none rounded-[10px] border border-white/8 bg-[#0B0D0F] px-3 py-2 text-[11px] leading-relaxed text-white outline-none placeholder:text-white/20 focus:border-cyan-400/24 transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/30">Tom</p>
                <textarea
                  value={expressionOverride}
                  onChange={(e) => setExpressionOverride(e.target.value)}
                  placeholder={parsedIdea.expressionDirection || 'Ex: confiante'}
                  rows={2}
                  className="w-full resize-none rounded-[10px] border border-white/8 bg-[#0B0D0F] px-3 py-2 text-[11px] leading-relaxed text-white outline-none placeholder:text-white/20 focus:border-cyan-400/24 transition-colors"
                />
              </div>
              <div>
                <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/30">Visual</p>
                <textarea
                  value={visualOverride}
                  onChange={(e) => setVisualOverride(e.target.value)}
                  placeholder={parsedIdeaBase.visualPrompt || scenePreset.prompt || 'Override de cena'}
                  rows={2}
                  className="w-full resize-none rounded-[10px] border border-white/8 bg-[#0B0D0F] px-3 py-2 text-[11px] leading-relaxed text-white outline-none placeholder:text-white/20 focus:border-cyan-400/24 transition-colors"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Formato + Qualidade */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/36">Formato</p>
          <Select
            value={aspectRatio}
            onChange={setAspectRatio}
            options={STUDIO_ASPECT_RATIO_PRESETS.map((o) => ({ value: o.value, label: `${o.label} · ${o.hint}` }))}
          />
        </div>
        <div>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/36">Qualidade</p>
          <Select
            value={quality}
            onChange={setQuality}
            options={[
              { value: '720p',  label: '720p — 93 CR'  },
              { value: '1080p', label: '1080p — 143 CR' },
            ]}
          />
        </div>
      </div>

      {/* Meta row */}
      <p className="text-right text-[9px] text-white/36">
        8s fixo · <span className="font-semibold text-white/56">{cost} CR</span>
      </p>

      {/* Gerar */}
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => {
          setLoading(true)
          onGenerate({
            source_image_url:     imageUrl,
            talking_video_mode:   mode,
            scene_preset_id:      scenePresetId,
            idea_prompt:          ideaPrompt,
            speech_text:          speechOverride,
            expression_direction: expressionOverride,
            visual_prompt:        resolvedVisualPrompt,
            speed,
            quality,
            aspect_ratio:         aspectRatio,
            voice_id:             voiceId,
          })
        }}
        className="flex w-full items-center justify-center gap-2 rounded-[13px] bg-cyan-500 py-3 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-35"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Clapperboard size={14} />}
        {loading ? 'Gerando...' : ctaLabel}
      </button>
    </div>
  )
}
