'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Clapperboard, Mic, MessageSquareQuote, Sparkles } from 'lucide-react'
import ImageUpload from './ImageUpload'
import {
  StudioFieldLabel,
  StudioFormShell,
  StudioHint,
  StudioPanel,
  StudioPrimaryButton,
  StudioSummaryChip,
} from './StudioFormShell'
import { CREDIT_COST } from '@/constants/studio'
import {
  buildTalkingVideoIdeaFromParts,
  estimateTalkingSpeechDurationSeconds,
  parseTalkingVideoIdeaInput,
} from '@/lib/talkingVideoIdea'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

type TalkingVideoMode = 'exact_speech' | 'veo_natural'

const BR_VOICES = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (masculino)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (feminino)' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (feminino)' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli (feminino)' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh (masculino)' },
]

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
  const [speed, setSpeed] = useState(Number(initial.speed ?? 1.0))
  const [quality, setQuality] = useState(String(initial.quality ?? '720p'))
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const parsedIdea = useMemo(
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

  const estimateSeconds = useMemo(
    () => estimateTalkingSpeechDurationSeconds({ text: parsedIdea.speechText, speed }),
    [parsedIdea.speechText, speed],
  )
  const estimateTone = getEstimateTone(estimateSeconds)
  const baseVideoCost = CREDIT_COST.talking_video ?? CREDIT_COST.video_veo ?? 50
  const videoCost = quality === '1080p' ? baseVideoCost * 2 : baseVideoCost
  const cost = mode === 'exact_speech'
    ? videoCost + (CREDIT_COST.voice ?? 8) + (CREDIT_COST.lipsync ?? 20)
    : videoCost
  const speechTooLong = mode === 'exact_speech' && estimateSeconds > 8
  const exactSpeechMissing = mode === 'exact_speech' && !parsedIdea.speechDetected
  const naturalMissing = !imageUrl.trim() || (!parsedIdea.speechDetected && !parsedIdea.sceneDetected)
  const isDisabled = mode === 'exact_speech'
    ? !imageUrl.trim() || exactSpeechMissing || speechTooLong
    : naturalMissing

  return (
    <StudioFormShell
      accent="cyan"
      icon={<MessageSquareQuote size={18} />}
      title="Video com Fala"
      hideHeader
      layout="split"
      chips={[
        { label: mode === 'exact_speech' ? 'Frase exata' : 'Veo natural', tone: mode === 'exact_speech' ? 'cyan' : 'warning' },
        { label: quality === '1080p' ? '1080p HQ' : '720p', tone: quality === '1080p' ? 'warning' : 'neutral' },
        { label: '8 segundos', tone: 'neutral' },
      ]}
      media={
        <>
          <StudioPanel title="Base">
            <ImageUpload value={imageUrl} onChange={setImageUrl} label="Imagem fonte" accept="image/*" preview />
          </StudioPanel>

          <StudioPanel title="Modo">
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => setMode('exact_speech')}
                className={`rounded-[16px] border px-3 py-3 text-left transition-all ${
                  mode === 'exact_speech'
                    ? 'border-cyan-400/30 bg-cyan-500/12 text-white'
                    : 'border-white/8 bg-[#0B0D0F] text-white/46 hover:border-white/14 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Mic size={14} />
                  <span className="text-[11px] font-semibold">Frase exata</span>
                </div>
                <p className="mt-1 text-[9px] leading-relaxed text-white/46">A modelo fala exatamente a frase detectada em ate 8 segundos.</p>
              </button>

              <button
                type="button"
                onClick={() => setMode('veo_natural')}
                className={`rounded-[16px] border px-3 py-3 text-left transition-all ${
                  mode === 'veo_natural'
                    ? 'border-cyan-400/30 bg-cyan-500/12 text-white'
                    : 'border-white/8 bg-[#0B0D0F] text-white/46 hover:border-white/14 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={14} />
                  <span className="text-[11px] font-semibold">Veo natural</span>
                </div>
                <p className="mt-1 text-[9px] leading-relaxed text-white/46">A IA pode adaptar ritmo, entonacao e pequenas variacoes para soar mais organico.</p>
              </button>
            </div>
          </StudioPanel>
        </>
      }
      controls={
        <>
          <StudioPanel title="O que acontece no video?">
            <StudioFieldLabel
              trailing={
                mode === 'exact_speech'
                  ? (
                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-semibold ${
                        !parsedIdea.speechDetected
                          ? 'border border-amber-500/20 bg-amber-500/10 text-amber-200'
                          : estimateTone === 'safe'
                            ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                            : estimateTone === 'warning'
                              ? 'border border-amber-500/20 bg-amber-500/10 text-amber-200'
                              : 'border border-red-500/20 bg-red-500/10 text-red-200'
                      }`}
                    >
                      {!parsedIdea.speechDetected ? 'Fala nao detectada' : `Estimativa: ${estimateSeconds.toFixed(1)}s / 8s`}
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
              rows={9}
              className="w-full resize-none rounded-[18px] border border-white/8 bg-[#0B0D0F] px-3.5 py-3 text-[12px] leading-relaxed text-white outline-none transition-colors placeholder:text-white/24 focus:border-cyan-400/30"
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
              <StudioSummaryChip tone="neutral">modelo preservada</StudioSummaryChip>
              <StudioSummaryChip tone={mode === 'exact_speech' ? 'cyan' : 'warning'}>
                {mode === 'exact_speech' ? 'speech-safe ativo' : 'audio mais livre'}
              </StudioSummaryChip>
            </div>
            <div className="mt-2 space-y-1.5">
              {mode === 'exact_speech' ? (
                <>
                  <StudioHint>Escreva a fala entre aspas ou coloque a frase na primeira linha. O resto pode ser tom, cena e camera.</StudioHint>
                  <StudioHint tone={exactSpeechMissing || speechTooLong ? 'warning' : 'neutral'}>
                    {exactSpeechMissing
                      ? 'Nao encontrei a frase exata ainda. Coloque a fala entre aspas para reduzir erro.'
                      : speechTooLong
                        ? 'A fala detectada passou do limite seguro de 8 segundos. Encurte a frase principal antes de gerar.'
                        : 'O sistema extrai fala, emocao e direcao visual automaticamente para reduzir retrabalho.'}
                  </StudioHint>
                </>
              ) : (
                <StudioHint tone="warning">
                  Neste modo a IA pode adaptar as palavras. Use Frase exata quando a literalidade for obrigatoria.
                </StudioHint>
              )}
            </div>
          </StudioPanel>

          <StudioPanel title="Leitura automatica" accent="cyan">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <StudioFieldLabel>Fala extraida</StudioFieldLabel>
                <div className="min-h-[92px] rounded-[18px] border border-white/8 bg-[#0B0D0F] px-3.5 py-3 text-[11px] leading-relaxed text-white/78">
                  {parsedIdea.speechText || <span className="text-white/26">O sistema vai detectar a fala aqui.</span>}
                </div>
              </div>
              <div>
                <StudioFieldLabel>Tom emocional</StudioFieldLabel>
                <div className="min-h-[92px] rounded-[18px] border border-white/8 bg-[#0B0D0F] px-3.5 py-3 text-[11px] leading-relaxed text-white/78">
                  {parsedIdea.expressionDirection || <span className="text-white/26">Tom automatico se voce nao especificar.</span>}
                </div>
              </div>
              <div>
                <StudioFieldLabel>Direcao visual</StudioFieldLabel>
                <div className="min-h-[92px] rounded-[18px] border border-white/8 bg-[#0B0D0F] px-3.5 py-3 text-[11px] leading-relaxed text-white/78">
                  {parsedIdea.visualPrompt || <span className="text-white/26">Cena livre, coerente com a imagem base.</span>}
                </div>
              </div>
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
                      rows={3}
                      className="w-full resize-none rounded-[18px] border border-white/8 bg-[#0B0D0F] px-3.5 py-3 text-[12px] leading-relaxed text-white outline-none transition-colors placeholder:text-white/24 focus:border-cyan-400/30"
                    />
                  </div>
                  <div>
                    <StudioFieldLabel>Tom emocional</StudioFieldLabel>
                    <textarea
                      value={expressionOverride}
                      onChange={(event) => setExpressionOverride(event.target.value)}
                      placeholder={parsedIdea.expressionDirection || 'Override manual do tom'}
                      rows={3}
                      className="w-full resize-none rounded-[18px] border border-white/8 bg-[#0B0D0F] px-3.5 py-3 text-[12px] leading-relaxed text-white outline-none transition-colors placeholder:text-white/24 focus:border-cyan-400/30"
                    />
                  </div>
                </div>
                <div>
                  <StudioFieldLabel>Direcao visual</StudioFieldLabel>
                  <textarea
                    value={visualOverride}
                    onChange={(event) => setVisualOverride(event.target.value)}
                    placeholder={parsedIdea.visualPrompt || 'Override manual de cena, camera e atmosfera'}
                    rows={3}
                    className="w-full resize-none rounded-[18px] border border-white/8 bg-[#0B0D0F] px-3.5 py-3 text-[12px] leading-relaxed text-white outline-none transition-colors placeholder:text-white/24 focus:border-cyan-400/30"
                  />
                </div>
              </div>
            ) : null}
          </StudioPanel>

          {mode === 'exact_speech' ? (
            <StudioPanel title="Voz">
              <div className="grid gap-3 sm:grid-cols-2">
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
                <div>
                  <StudioFieldLabel trailing={<span>{speed.toFixed(2)}x</span>}>Velocidade</StudioFieldLabel>
                  <input
                    type="range"
                    min="0.8"
                    max="1.2"
                    step="0.05"
                    value={speed}
                    onChange={(event) => setSpeed(Number(event.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>
            </StudioPanel>
          ) : null}

          <StudioPanel title="Qualidade">
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
                      ? 'border-cyan-400/30 bg-cyan-500/12 text-white'
                      : 'border-white/8 bg-[#0B0D0F] text-white/46 hover:border-white/14 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
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
                idea_prompt: ideaPrompt,
                speech_text: speechOverride,
                expression_direction: expressionOverride,
                visual_prompt: visualOverride,
                voice_id: voiceId,
                speed,
                quality,
              })
            }
          >
            <Clapperboard size={16} />
            {mode === 'exact_speech' ? `Gerar video falado - ${cost} CR` : `Gerar Veo natural - ${cost} CR`}
          </StudioPrimaryButton>
        </>
      }
    />
  )
}
