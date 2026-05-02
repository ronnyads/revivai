'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Clapperboard, Mic, MessageSquareQuote, Sparkles } from 'lucide-react'
import ImageUpload from './ImageUpload'
import {
  StudioFieldLabel,
  StudioFormShell,
  StudioPanel,
  StudioPrimaryButton,
  StudioSummaryChip,
} from './StudioFormShell'
import {
  buildTalkingVideoIdeaFromParts,
  calculateTalkingVideoCredits,
  estimateTalkingSpeechDurationSeconds,
  planTalkingVideoSpeechChunk,
  parseTalkingVideoIdeaInput,
} from '@/lib/talkingVideoIdea'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

type TalkingVideoMode = 'exact_speech' | 'veo_natural'
type ScenePresetId = 'none' | 'podcast' | 'beach' | 'office'

const BR_VOICES = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (masculino)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (feminino)' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (feminino)' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli (feminino)' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh (masculino)' },
]

const SCENE_PRESETS: Array<{
  id: ScenePresetId
  label: string
  shortLabel: string
  description: string
  prompt: string
}> = [
  {
    id: 'none',
    label: 'Sem preset',
    shortLabel: 'Cena livre',
    description: 'Mantem a cena aberta para a direcao que voce escrever na ideia.',
    prompt: '',
  },
  {
    id: 'podcast',
    label: 'Podcast',
    shortLabel: 'Podcast',
    description: 'Estudio com microfone, mesa clean e clima de conversa intimista.',
    prompt: 'estudio de podcast premium, microfone visivel, mesa clean, luz quente controlada, enquadramento meio corpo, atmosfera intimista',
  },
  {
    id: 'beach',
    label: 'Praia',
    shortLabel: 'Praia',
    description: 'Litoral ensolarado com vento leve e textura natural de fim de tarde.',
    prompt: 'praia ensolarada, brisa suave, mar ao fundo, luz de fim de tarde, atmosfera leve, enquadramento natural',
  },
  {
    id: 'office',
    label: 'Escritorio',
    shortLabel: 'Escritorio',
    description: 'Ambiente profissional limpo, luz suave e sensacao corporativa premium.',
    prompt: 'escritorio contemporaneo, mesa organizada, luz suave de janela, atmosfera corporativa premium, enquadramento profissional',
  },
]

function joinPromptParts(parts: string[]) {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part, index, array) => array.indexOf(part) === index)
    .join(', ')
}

function getEstimateTone(seconds: number) {
  if (seconds <= 6.6) return 'safe'
  if (seconds <= 7.8) return 'warning'
  return 'danger'
}

function getInitialIdeaPrompt(initial: Record<string, unknown>) {
  const savedIdea = typeof initial.idea_prompt === 'string' ? initial.idea_prompt : ''
  if (savedIdea.trim()) return savedIdea

  return buildTalkingVideoIdeaFromParts({
    speechText: typeof initial.speech_text === 'string' ? initial.speech_text : '',
    expressionDirection: typeof initial.expression_direction === 'string' ? initial.expression_direction : '',
    visualPrompt: typeof initial.visual_prompt === 'string' ? initial.visual_prompt : '',
  })
}

function getInitialScenePreset(initial: Record<string, unknown>): ScenePresetId {
  const savedPreset = String(initial.scene_preset_id ?? '').trim().toLowerCase()
  if (savedPreset === 'podcast' || savedPreset === 'beach' || savedPreset === 'office') {
    return savedPreset
  }

  const seed = `${String(initial.idea_prompt ?? '')} ${String(initial.visual_prompt ?? '')}`.toLowerCase()

  if (/(podcast|microfone|estudio de podcast)/.test(seed)) return 'podcast'
  if (/(praia|mar|areia|litoral|oceano)/.test(seed)) return 'beach'
  if (/(escritorio|office|mesa de trabalho|corporativ)/.test(seed)) return 'office'

  return 'none'
}

export default function TalkingVideoGenerator({ initial, onGenerate }: Props) {
  const savedIdeaPrompt = getInitialIdeaPrompt(initial)
  const hasSavedIdeaPrompt = savedIdeaPrompt.trim().length > 0
  const [imageUrl, setImageUrl] = useState(String(initial.source_image_url ?? ''))
  const [mode, setMode] = useState<TalkingVideoMode>(
    String(initial.talking_video_mode ?? 'exact_speech') === 'veo_natural' ? 'veo_natural' : 'exact_speech',
  )
  const [ideaPrompt, setIdeaPrompt] = useState(savedIdeaPrompt)
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
  const [voiceId, setVoiceId] = useState(String(initial.voice_id ?? 'EXAVITQu4vr4xnSDxMaL'))
  const speed = 1.0
  const [quality, setQuality] = useState(String(initial.quality ?? '720p'))
  const [scenePresetId, setScenePresetId] = useState<ScenePresetId>(getInitialScenePreset(initial))
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const scenePreset = useMemo(
    () => SCENE_PRESETS.find((preset) => preset.id === scenePresetId) ?? SCENE_PRESETS[0],
    [scenePresetId],
  )
  const parsedIdeaBase = useMemo(
    () =>
      parseTalkingVideoIdeaInput({
        mode,
        ideaPrompt,
        speechText: speechOverride,
        expressionDirection: expressionOverride,
        visualPrompt: visualOverride,
      }),
    [mode, ideaPrompt, speechOverride, expressionOverride, visualOverride],
  )
  const resolvedVisualPrompt = useMemo(
    () => joinPromptParts([scenePreset.prompt, parsedIdeaBase.visualPrompt]),
    [scenePreset.prompt, parsedIdeaBase.visualPrompt],
  )
  const parsedIdea = useMemo(
    () => ({
      ...parsedIdeaBase,
      visualPrompt: resolvedVisualPrompt,
      sceneDetected: resolvedVisualPrompt.length > 0,
    }),
    [parsedIdeaBase, resolvedVisualPrompt],
  )

  const estimateSeconds = useMemo(
    () => estimateTalkingSpeechDurationSeconds({ text: parsedIdea.speechText, speed }),
    [parsedIdea.speechText, speed],
  )
  const chunkPlan = useMemo(
    () => planTalkingVideoSpeechChunk({ text: parsedIdea.speechText, speed, targetSeconds: 7.35, maxSeconds: 7.95 }),
    [parsedIdea.speechText, speed],
  )
  const speechWillContinue = mode === 'exact_speech' && chunkPlan.hasRemaining
  const estimateTone = getEstimateTone(speechWillContinue ? chunkPlan.selectedSeconds : estimateSeconds)
  const requiresVoicePipeline = mode === 'exact_speech' || parsedIdea.speechDetected
  const cost = calculateTalkingVideoCredits({
    mode,
    quality,
    speechDetected: parsedIdea.speechDetected,
  })
  const exactSpeechMissing = mode === 'exact_speech' && !parsedIdea.speechDetected
  const naturalMissing = !imageUrl.trim() || (!parsedIdea.speechDetected && !parsedIdea.sceneDetected)
  const isDisabled = mode === 'exact_speech'
    ? !imageUrl.trim() || exactSpeechMissing
    : naturalMissing
  const modeLabel = mode === 'exact_speech' ? 'Frase exata' : 'Veo natural'
  const modeDescription = mode === 'exact_speech'
    ? 'A modelo fala exatamente a frase detectada em ate 8 segundos.'
    : 'A IA pode adaptar ritmo, entonacao e pequenas variacoes para soar mais organico.'
  const visualOverridePlaceholder = parsedIdeaBase.visualPrompt || scenePreset.prompt || 'Override manual de cena, camera e atmosfera'

  return (
    <StudioFormShell
      accent="cyan"
      icon={<MessageSquareQuote size={18} />}
      title="Video com Fala"
      hideHeader
      layout="split"
      contentClassName="gap-2.5"
      mediaColumnClassName="space-y-2.5"
      controlsColumnClassName="space-y-2.5"
      chips={[
        { label: mode === 'exact_speech' ? 'Frase exata' : 'Veo natural', tone: mode === 'exact_speech' ? 'cyan' : 'warning' },
        { label: quality === '1080p' ? '1080p HQ' : '720p', tone: quality === '1080p' ? 'warning' : 'neutral' },
        { label: '8 segundos', tone: 'neutral' },
      ]}
      media={
        <>
          <StudioPanel title="Base" compact>
            <ImageUpload value={imageUrl} onChange={setImageUrl} label="Imagem fonte" accept="image/*" preview compact />
          </StudioPanel>

          <StudioPanel title="Setup" compact>
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <StudioFieldLabel>Modo</StudioFieldLabel>
                  <select
                    value={mode}
                    onChange={(event) => setMode(event.target.value as TalkingVideoMode)}
                    className="w-full rounded-[16px] border border-white/8 bg-[#0B0D0F] px-3 py-2.5 text-[11px] text-white outline-none transition-colors focus:border-cyan-400/30"
                  >
                    <option value="exact_speech">Frase exata</option>
                    <option value="veo_natural">Veo natural</option>
                  </select>
                </div>
                <div>
                  <StudioFieldLabel>Cenario preset</StudioFieldLabel>
                  <select
                    value={scenePresetId}
                    onChange={(event) => setScenePresetId(event.target.value as ScenePresetId)}
                    className="w-full rounded-[16px] border border-white/8 bg-[#0B0D0F] px-3 py-2.5 text-[11px] text-white outline-none transition-colors focus:border-cyan-400/30"
                  >
                    {SCENE_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>{preset.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-[16px] border border-cyan-500/14 bg-cyan-500/[0.06] px-3 py-2.5">
                <div className="flex items-center gap-2 text-[10px] font-semibold text-white">
                  {mode === 'exact_speech' ? <Mic size={13} className="text-cyan-200" /> : <Sparkles size={13} className="text-cyan-200" />}
                  <span>{modeLabel}</span>
                  <span className="text-white/34">/</span>
                  <span className="text-cyan-200">{scenePreset.shortLabel}</span>
                </div>
                <p className="mt-1 text-[9px] leading-relaxed text-white/52">
                  {modeDescription} {scenePreset.description}
                </p>
              </div>
            </div>
          </StudioPanel>
        </>
      }
      controls={
        <>
          <StudioPanel title="O que acontece no video?" compact>
            <StudioFieldLabel
              trailing={
                mode === 'exact_speech'
                  ? (
                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-semibold ${
                        !parsedIdea.speechDetected
                          ? 'border border-amber-500/20 bg-amber-500/10 text-amber-200'
                          : speechWillContinue
                            ? 'border border-amber-500/20 bg-amber-500/10 text-amber-200'
                            : estimateTone === 'safe'
                            ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                            : estimateTone === 'warning'
                              ? 'border border-amber-500/20 bg-amber-500/10 text-amber-200'
                              : 'border border-red-500/20 bg-red-500/10 text-red-200'
                      }`}
                    >
                      {!parsedIdea.speechDetected
                        ? 'Fala nao detectada'
                        : speechWillContinue
                          ? `Total ${estimateSeconds.toFixed(1)}s -> parte 1 ${chunkPlan.selectedSeconds.toFixed(1)}s`
                          : `Estimativa: ${estimateSeconds.toFixed(1)}s / 8s`}
                    </span>
                  )
                  : null
              }
            >
              Ideia completa
            </StudioFieldLabel>
            <textarea
              value={ideaPrompt}
              onChange={(event) => setIdeaPrompt(event.target.value)}
              placeholder={`Ex:\n"cara... eu preciso sair mais e fazer amigos novos"\n\nmulher caminhando em parque de outono,\ntom emocional intimo,\nolhando para camera,\nvideo cinematografico natural`}
              rows={3}
              className="w-full resize-none rounded-[18px] border border-white/8 bg-[#0B0D0F] px-3.5 py-2.5 text-[12px] leading-relaxed text-white outline-none transition-colors placeholder:text-white/24 focus:border-cyan-400/30"
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              <StudioSummaryChip tone={parsedIdea.speechDetected ? 'success' : 'warning'}>
                {parsedIdea.speechDetected ? 'fala detectada' : 'fala faltando'}
              </StudioSummaryChip>
              <StudioSummaryChip tone={parsedIdea.emotionDetected ? 'success' : 'neutral'}>
                {parsedIdea.emotionDetected ? 'tom detectado' : 'tom automatico'}
              </StudioSummaryChip>
              <StudioSummaryChip tone={parsedIdea.sceneDetected ? 'success' : 'neutral'}>
                {parsedIdea.sceneDetected ? 'cena detectada' : 'cena aberta'}
              </StudioSummaryChip>
              <StudioSummaryChip tone={scenePreset.id === 'none' ? 'neutral' : 'cyan'}>
                {scenePreset.shortLabel}
              </StudioSummaryChip>
              <StudioSummaryChip tone="neutral">modelo preservada</StudioSummaryChip>
              <StudioSummaryChip tone={mode === 'exact_speech' ? 'cyan' : 'warning'}>
                {speechWillContinue ? 'continua em partes' : mode === 'exact_speech' ? 'speech-safe ativo' : 'audio mais livre'}
              </StudioSummaryChip>
              {requiresVoicePipeline ? (
                <StudioSummaryChip tone="cyan">voice + lipsync incluidos</StudioSummaryChip>
              ) : null}
            </div>
          </StudioPanel>

          <StudioPanel compact>
            <button
              type="button"
              onClick={() => setAdvancedOpen((value) => !value)}
              className="flex w-full items-center justify-between rounded-[16px] border border-white/8 bg-[#0B0D0F] px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 transition-colors hover:border-white/14 hover:text-white"
            >
              <span>Avancado</span>
              <ChevronDown size={14} className={`transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
            </button>

            {advancedOpen ? (
              <div className="mt-3 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <StudioFieldLabel>Fala exata</StudioFieldLabel>
                    <textarea
                      value={speechOverride}
                      onChange={(event) => setSpeechOverride(event.target.value)}
                      placeholder={parsedIdea.speechText || 'Override manual da fala detectada'}
                      rows={2}
                      className="w-full resize-none rounded-[18px] border border-white/8 bg-[#0B0D0F] px-3.5 py-2.5 text-[12px] leading-relaxed text-white outline-none transition-colors placeholder:text-white/24 focus:border-cyan-400/30"
                    />
                  </div>
                  <div>
                    <StudioFieldLabel>Tom emocional</StudioFieldLabel>
                    <textarea
                      value={expressionOverride}
                      onChange={(event) => setExpressionOverride(event.target.value)}
                      placeholder={parsedIdea.expressionDirection || 'Override manual do tom'}
                      rows={2}
                      className="w-full resize-none rounded-[18px] border border-white/8 bg-[#0B0D0F] px-3.5 py-2.5 text-[12px] leading-relaxed text-white outline-none transition-colors placeholder:text-white/24 focus:border-cyan-400/30"
                    />
                  </div>
                </div>
                <div>
                  <StudioFieldLabel>Direcao visual</StudioFieldLabel>
                  <textarea
                    value={visualOverride}
                    onChange={(event) => setVisualOverride(event.target.value)}
                    placeholder={visualOverridePlaceholder}
                    rows={2}
                    className="w-full resize-none rounded-[18px] border border-white/8 bg-[#0B0D0F] px-3.5 py-2.5 text-[12px] leading-relaxed text-white outline-none transition-colors placeholder:text-white/24 focus:border-cyan-400/30"
                  />
                </div>
              </div>
            ) : null}
          </StudioPanel>

          <StudioPanel title="Saida" compact>
            <div className={`grid gap-3 ${mode === 'exact_speech' ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}>
              {mode === 'exact_speech' ? (
                <>
                  <div>
                    <StudioFieldLabel>Voz</StudioFieldLabel>
                    <select
                      value={voiceId}
                      onChange={(event) => setVoiceId(event.target.value)}
                      className="w-full rounded-[16px] border border-white/8 bg-[#0B0D0F] px-3 py-2.5 text-[11px] text-white outline-none transition-colors focus:border-cyan-400/30"
                    >
                      {BR_VOICES.map((voice) => (
                        <option key={voice.id} value={voice.id}>{voice.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : null}
              <div>
                <StudioFieldLabel>Qualidade</StudioFieldLabel>
                <select
                  value={quality}
                  onChange={(event) => setQuality(event.target.value)}
                  className="w-full rounded-[16px] border border-white/8 bg-[#0B0D0F] px-3 py-2.5 text-[11px] text-white outline-none transition-colors focus:border-cyan-400/30"
                >
                  <option value="720p">720p</option>
                  <option value="1080p">1080p HQ</option>
                </select>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-[16px] border border-cyan-500/14 bg-cyan-500/[0.06] px-3 py-2.5">
              <span className="text-[10px] font-semibold text-cyan-200">8 segundos fixos</span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/46">{cost} CR</span>
            </div>
          </StudioPanel>

          <StudioPrimaryButton
            accent="cyan"
            disabled={isDisabled}
            onClick={() =>
              onGenerate({
                source_image_url: imageUrl,
                talking_video_mode: mode,
                scene_preset_id: scenePresetId,
                idea_prompt: ideaPrompt,
                speech_text: speechOverride,
                expression_direction: expressionOverride,
                visual_prompt: resolvedVisualPrompt,
                voice_id: voiceId,
                speed,
                quality,
              })
            }
          >
            <Clapperboard size={16} />
            {mode === 'exact_speech'
              ? `Gerar video falado - ${cost} CR`
              : requiresVoicePipeline
                ? `Gerar Veo natural falado - ${cost} CR`
                : `Gerar Veo natural - ${cost} CR`}
          </StudioPrimaryButton>
        </>
      }
    />
  )
}
