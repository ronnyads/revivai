'use client'

import { Download, Film, Sparkles, User } from 'lucide-react'
import { useState } from 'react'
import { CREDIT_COST } from '@/constants/studio'
import { getPreviewMediaUrl } from '@/lib/mediaUrl'
import ImageUpload from './ImageUpload'
import {
  StudioFieldLabel,
  StudioFormShell,
  StudioHint,
  StudioPanel,
  StudioPrimaryButton,
  StudioSummaryChip,
} from './StudioFormShell'
import WebcamRecorder from './WebcamRecorder'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

const DEFAULT_MOTION_PROMPT =
  'Use o video de referencia para guiar gesto, energia e camera, mantendo a identidade e o cenario-base da foto.'

function buildChecklistMarkdown() {
  return `# Checklist ideal — Movimento Guiado

## Foto ideal
- Use a foto como referencia central de identidade e cenario base.
- Prefira enquadramento parecido com o video de referencia.
- Se o video for meio corpo, use foto em meio corpo tambem.
- Mantenha rosto nitido, bracos legiveis e pose limpa.
- Quanto mais proxima a roupa, luz e camera do video, melhor.

## Video ideal
- Prefira videos simples, com um unico take e pouco caos no fundo.
- Gesto claro, ritmo definido e camera previsivel ajudam muito.
- Referencias com muitos giros, maos agressivas ou danca complexa tendem a aproximar menos.
- Limite recomendado: movimentos limpos e progressao curta.

## Alinhamento entre foto e video
- Foto e video devem contar a mesma geometria: altura de camera, corte e postura.
- Video de meio corpo funciona melhor com foto de meio corpo.
- Video aberto com corpo inteiro pede foto mais aberta.
- Se a foto estiver muito fechada e o video mostrar muito braco/corpo, a chance de erro sobe.

## Casos que tendem a dar erro
- Selfie muito fechada com video cheio de gesto corporal.
- Video lateral com foto frontal extrema.
- Foto com roupa e luz muito diferentes da referencia.
- Cenario da foto muito diferente do resultado desejado.

## Regra pratica
- Foto manda na identidade e no visual base.
- Video guia gesto, energia, ritmo e camera.
- O resultado final e uma nova geracao guiada, nao uma troca exata frame a frame.
`
}

export default function AnimateGenerator({ initial, onGenerate }: Props) {
  const connectedPortraitUrl = String(initial.portrait_image_url ?? '')
  const connectedDrivingUrl = String(initial.driving_video_url ?? '')
  const [uploadedPortraitUrl, setUploadedPortraitUrl] = useState('')
  const [recordedDrivingUrl, setRecordedDrivingUrl] = useState('')
  const [motionPrompt, setMotionPrompt] = useState(String(initial.motion_prompt ?? DEFAULT_MOTION_PROMPT))
  const [loadedPreviewUrl, setLoadedPreviewUrl] = useState('')

  const portraitUrl = uploadedPortraitUrl || connectedPortraitUrl
  const drivingUrl = recordedDrivingUrl || connectedDrivingUrl
  const drivingPreviewUrl = getPreviewMediaUrl(drivingUrl)
  const hasPortrait = !!portraitUrl.trim()
  const hasDriving = !!drivingUrl.trim()
  const previewReady = loadedPreviewUrl === drivingUrl
  const cost = CREDIT_COST.animate

  function handleDownloadChecklist() {
    const blob = new Blob([buildChecklistMarkdown()], { type: 'text/markdown;charset=utf-8' })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = 'movimento-guiado-checklist-ideal.md'
    link.click()
    URL.revokeObjectURL(objectUrl)
  }

  return (
    <StudioFormShell
      accent="violet"
      icon={<Film size={18} />}
      title="Movimento Guiado"
      hideHeader
      layout="split"
      chips={[
        { label: 'foto manda no visual', tone: 'violet' },
        { label: 'video so guia', tone: 'neutral' },
        { label: '50 CR', tone: 'warning' },
      ]}
      media={
        <>
          <StudioPanel title="Base visual" compact>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <StudioSummaryChip tone={hasPortrait ? 'violet' : 'neutral'}>
                  {hasPortrait ? 'retrato pronto' : 'falta retrato'}
                </StudioSummaryChip>
                <StudioSummaryChip tone="neutral">cenario vem da foto</StudioSummaryChip>
              </div>
              <ImageUpload
                value={uploadedPortraitUrl}
                onChange={setUploadedPortraitUrl}
                label={hasPortrait ? 'Trocar foto da pessoa' : 'Foto da pessoa'}
                accept="image/*"
                preview
                compact
                frameClassName="min-h-[180px]"
              />
              {connectedPortraitUrl && !uploadedPortraitUrl ? (
                <StudioHint>A foto conectada continua sendo a referencia central de identidade e cenario base.</StudioHint>
              ) : (
                <StudioHint>Escolha uma foto ja proxima do enquadramento e do ambiente desejados.</StudioHint>
              )}
            </div>
          </StudioPanel>

          {hasPortrait && hasDriving ? (
            <StudioPanel title="Leitura rapida" compact>
              <div className="grid grid-cols-2 gap-2">
                <div className="overflow-hidden rounded-[16px] border border-white/8 bg-[#0B0D0F]">
                  <p className="border-b border-white/6 px-2.5 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/42">
                    foto base
                  </p>
                  <img src={portraitUrl} alt="Foto base" className="aspect-[4/5] w-full object-cover" />
                </div>
                <div className="overflow-hidden rounded-[16px] border border-white/8 bg-[#0B0D0F]">
                  <p className="border-b border-white/6 px-2.5 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/42">
                    video guia
                  </p>
                  <div className="relative">
                    <video
                      key={drivingUrl}
                      src={drivingPreviewUrl}
                      className="aspect-[4/5] w-full object-cover"
                      playsInline
                      muted
                      autoPlay
                      loop
                      preload="metadata"
                      onLoadedMetadata={(event) => {
                        const video = event.currentTarget
                        const targetTime = Math.min(0.15, Math.max((video.duration || 0) - 0.01, 0))
                        if (targetTime > 0) {
                          video.currentTime = targetTime
                          return
                        }
                        setLoadedPreviewUrl(drivingUrl)
                        void video.play().catch(() => {})
                      }}
                      onSeeked={(event) => {
                        setLoadedPreviewUrl(drivingUrl)
                        void event.currentTarget.play().catch(() => {})
                      }}
                      onLoadedData={(event) => {
                        if (loadedPreviewUrl === drivingUrl) return
                        setLoadedPreviewUrl(drivingUrl)
                        void event.currentTarget.play().catch(() => {})
                      }}
                    />
                    {!previewReady ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/90 px-3 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                        carregando previa
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </StudioPanel>
          ) : null}
        </>
      }
      controls={
        <>
          <StudioPanel title="Video de referencia" compact>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <StudioSummaryChip tone={hasDriving ? 'success' : 'neutral'}>
                  {hasDriving ? 'video pronto' : 'falta video'}
                </StudioSummaryChip>
                <StudioSummaryChip tone="neutral">guia gesto e camera</StudioSummaryChip>
                <StudioSummaryChip tone="neutral">30s max</StudioSummaryChip>
              </div>
              <WebcamRecorder value={drivingUrl} onChange={setRecordedDrivingUrl} />
              <StudioHint>Use um video simples e com enquadramento parecido com a foto para aumentar a fidelidade.</StudioHint>
            </div>
          </StudioPanel>

          <StudioPanel title="Direcao" compact>
            <StudioFieldLabel>Instrucao do movimento</StudioFieldLabel>
            <textarea
              value={motionPrompt}
              onChange={(event) => setMotionPrompt(event.target.value)}
              rows={2}
              className="w-full resize-none rounded-[18px] border border-white/8 bg-[#0B0D0F] px-3.5 py-3 text-[12px] leading-relaxed text-white outline-none transition-colors placeholder:text-white/24 focus:border-violet-400/30"
              placeholder="Ex: energia confiante, passo suave e camera acompanhando de leve."
            />
            <div className="mt-2 space-y-1.5">
              <StudioHint>A foto manda na identidade e no cenario base. O video apenas guia gesto, ritmo e camera.</StudioHint>
              <StudioHint tone="warning">O resultado final e uma nova geracao guiada, nao uma troca exata frame a frame.</StudioHint>
            </div>
          </StudioPanel>

          <StudioPanel title="Apoio rapido" compact>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleDownloadChecklist}
                className="flex flex-1 items-center justify-center gap-2 rounded-[16px] border border-white/8 bg-[#0B0D0F] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/76 transition-colors hover:border-violet-400/28 hover:text-white"
              >
                <Download size={14} />
                Baixar checklist ideal
              </button>
              <div className="flex flex-1 items-center gap-2 rounded-[16px] border border-violet-500/14 bg-violet-500/[0.06] px-3 py-2.5 text-[10px] leading-relaxed text-white/58">
                <User size={14} className="shrink-0 text-violet-200" />
                Quanto mais a foto parecer com o take desejado, melhor o resultado.
              </div>
            </div>
          </StudioPanel>

          <StudioPrimaryButton
            accent="violet"
            disabled={!hasPortrait || !hasDriving}
            onClick={() =>
              onGenerate({
                portrait_image_url: portraitUrl,
                driving_video_url: drivingUrl,
                motion_prompt: motionPrompt,
              })
            }
          >
            <Sparkles size={16} />
            Gerar movimento guiado - {cost} CR
          </StudioPrimaryButton>
        </>
      }
    />
  )
}
