'use client'

import { Download, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { CREDIT_COST } from '@/constants/studio'
import ImageUpload from './ImageUpload'
import {
  StudioFieldLabel,
  StudioFormShell,
  StudioPanel,
  StudioPrimaryButton,
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

  const portraitUrl = uploadedPortraitUrl || connectedPortraitUrl
  const drivingUrl = recordedDrivingUrl || connectedDrivingUrl
  const hasPortrait = !!portraitUrl.trim()
  const hasDriving = !!drivingUrl.trim()
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
      icon={<Sparkles size={18} />}
      title="Movimento Guiado"
      hideHeader
      layout="split"
      contentClassName="gap-2.5"
      mediaColumnClassName="space-y-2.5"
      controlsColumnClassName="space-y-2.5"
      chips={[
        { label: 'foto base', tone: 'violet' },
        { label: '50 CR', tone: 'neutral' },
      ]}
      media={
        <>
          <StudioPanel title="Base visual" compact>
            <ImageUpload
              value={uploadedPortraitUrl}
              onChange={setUploadedPortraitUrl}
              label={hasPortrait ? 'Trocar foto da pessoa' : 'Foto da pessoa'}
              accept="image/*"
              preview
              compact
              frameClassName="min-h-[120px]"
            />
          </StudioPanel>
        </>
      }
      controls={
        <>
          <StudioPanel title="Referencia" compact>
            <StudioFieldLabel trailing={<span className="text-white/36">máx 30s</span>}>Video de movimento</StudioFieldLabel>
            <WebcamRecorder value={drivingUrl} onChange={setRecordedDrivingUrl} compact hideLabel />
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
          </StudioPanel>

          <StudioPanel compact>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleDownloadChecklist}
                className="flex flex-1 items-center justify-center gap-2 rounded-[16px] border border-white/8 bg-[#0B0D0F] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/76 transition-colors hover:border-violet-400/28 hover:text-white"
              >
                <Download size={14} />
                Baixar checklist ideal
              </button>
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
