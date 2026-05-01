'use client'

import { useState } from 'react'
import { Layers, Sparkles } from 'lucide-react'
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

const DEFAULT_POSITION = 'southeast'
const DEFAULT_SCALE = 0.35

const PRODUCT_PROMPT_CHIPS = [
  { label: 'Perto do rosto', value: 'produto perto do rosto, rotulo visivel' },
  { label: 'Na altura do peito', value: 'produto na altura do peito, bem visivel' },
  { label: 'Com duas maos', value: 'segurando com as duas maos, apresentacao estavel' },
  { label: 'Apontando detalhe', value: 'uma mao segurando e a outra apontando detalhes do produto' },
  { label: 'Sorriso suave', value: 'sorriso suave e natural' },
  { label: 'Olhar confiante', value: 'olhar confiante para a camera' },
]

const FITTING_POSE_PRESETS = [
  { value: 'frontal', label: 'Frontal' },
  { value: 'three-quarter', label: '3/4' },
  { value: 'full-body', label: 'Full body' },
  { value: 'seated', label: 'Sentada' },
  { value: 'standing', label: 'Em pe' },
  { value: 'hand-in-pocket', label: 'Mao no bolso' },
  { value: 'showing-bag', label: 'Mostrando bolsa' },
  { value: 'adjusting-glasses', label: 'Ajustando oculos' },
]

const FITTING_ENERGY_PRESETS = [
  { value: 'confiante', label: 'Confiante' },
  { value: 'natural', label: 'Natural' },
  { value: 'sorriso-suave', label: 'Sorriso suave' },
  { value: 'editorial-leve', label: 'Editorial leve' },
]

const ASPECT_RATIO_PRESETS = [
  { value: '9:16', label: 'Stories', hint: '9:16' },
  { value: '4:5', label: 'Feed', hint: '4:5' },
  { value: '1:1', label: 'Catalogo', hint: '1:1' },
  { value: '16:9', label: 'Horizontal', hint: '16:9' },
]

function getDefaultFittingPose(category: string): string {
  switch (category) {
    case 'bottoms':
    case 'one-pieces':
    case 'shoes':
      return 'full-body'
    case 'outerwear':
      return 'standing'
    case 'headwear':
      return 'frontal'
    case 'bags':
      return 'showing-bag'
    case 'glasses':
      return 'adjusting-glasses'
    case 'jewelry':
      return 'frontal'
    default:
      return 'three-quarter'
  }
}

function SelectionGrid({
  options,
  selectedValue,
  onSelect,
  columns = 'grid-cols-2',
}: {
  options: { value: string; label: string; hint?: string }[]
  selectedValue: string
  onSelect: (value: string) => void
  columns?: string
}) {
  return (
    <div className={`grid gap-2 ${columns}`}>
      {options.map((option) => {
        const selected = selectedValue === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`rounded-[16px] border px-3 py-2 text-left transition-all ${
              selected
                ? 'border-orange-400/40 bg-orange-500/12 text-white shadow-[0_0_0_1px_rgba(251,146,60,0.12)]'
                : 'border-white/8 bg-[#0C0E10] text-white/66 hover:border-white/14 hover:text-white'
            }`}
          >
            <span className="block text-[10px] font-semibold">{option.label}</span>
            {option.hint ? <span className="mt-0.5 block text-[9px] text-white/38">{option.hint}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

function PillGroup({
  options,
  selectedValue,
  onSelect,
}: {
  options: { value: string; label: string }[]
  selectedValue: string
  onSelect: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = selectedValue === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`rounded-full border px-3 py-1.5 text-[9px] font-medium transition-all ${
              selected
                ? 'border-orange-400/40 bg-orange-500/14 text-white'
                : 'border-white/8 bg-white/[0.03] text-white/62 hover:border-white/16 hover:text-white'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export default function ComposeCard({ initial, onGenerate }: Props) {
  const syncKey = JSON.stringify({
    portrait_url: initial.portrait_url ?? '',
    product_url: initial.product_url ?? '',
    product_urls: Array.isArray(initial.product_urls) ? initial.product_urls : [],
    aspect_ratio: initial.aspect_ratio ?? '9:16',
    fitting_pose_preset: initial.fitting_pose_preset ?? '',
    fitting_energy_preset: initial.fitting_energy_preset ?? '',
    smart_prompt: initial.smart_prompt ?? '',
  })

  return <ComposeCardBody key={syncKey} initial={initial} onGenerate={onGenerate} />
}

function ComposeCardBody({ initial, onGenerate }: Props) {
  const variant = String(initial.compose_variant ?? 'fitting')
  const initialFittingCategory =
    typeof initial.fitting_category === 'string'
      ? initial.fitting_category
      : typeof initial.vton_category === 'string'
        ? initial.vton_category
        : ''
  const initialReferenceUrls = Array.isArray(initial.product_urls)
    ? initial.product_urls
      .filter((value): value is string => typeof value === 'string')
      .slice(0, 3)
    : []
  while (initialReferenceUrls.length < 3) initialReferenceUrls.push('')

  const [portraitUrl, setPortraitUrl] = useState(String(initial.portrait_url ?? ''))
  const [productUrl, setProductUrl] = useState(String(initial.product_url ?? ''))
  const [referenceUrls, setReferenceUrls] = useState<string[]>(
    initialReferenceUrls.some((url) => url.trim().length > 0)
      ? initialReferenceUrls
      : [String(initial.product_url ?? ''), '', ''],
  )
  const [aspectRatio, setAspectRatio] = useState(String(initial.aspect_ratio ?? '9:16'))
  const [fittingPosePreset, setFittingPosePreset] = useState(String(initial.fitting_pose_preset ?? getDefaultFittingPose(initialFittingCategory || 'tops')))
  const [fittingEnergyPreset, setFittingEnergyPreset] = useState(String(initial.fitting_energy_preset ?? 'natural'))
  const [smartPrompt, setSmartPrompt] = useState(String(initial.smart_prompt ?? ''))

  const hasPortrait = !!portraitUrl.trim()
  const isProductVariant = variant === 'product'
  const fittingReferenceUrls = referenceUrls.map((url) => url.trim())
  const activeFittingReferenceUrls = fittingReferenceUrls.filter(Boolean)
  const hasProduct = isProductVariant ? !!productUrl.trim() : activeFittingReferenceUrls.length > 0
  const cost = isProductVariant ? CREDIT_COST.compose : 24
  const title = isProductVariant ? 'Modelo + Produto' : 'Provador'
  const selectedAspect = ASPECT_RATIO_PRESETS.find((item) => item.value === aspectRatio)
  const selectedPoseLabel = FITTING_POSE_PRESETS.find((item) => item.value === fittingPosePreset)?.label ?? 'Pose'

  function setReferenceAt(index: number, url: string) {
    setReferenceUrls((current) => current.map((value, itemIndex) => (itemIndex === index ? url : value)))
  }

  function applyProductPromptChip(value: string) {
    setSmartPrompt((current) => {
      const trimmed = current.trim()
      if (trimmed.toLowerCase().includes(value.toLowerCase())) return current
      return trimmed ? `${trimmed}; ${value}` : value
    })
  }

  const summaryChips = isProductVariant
    ? [
      { label: 'Produto', tone: 'orange' as const },
      { label: 'Fundo branco', tone: 'neutral' as const },
    ]
    : [
      { label: selectedAspect?.label ?? aspectRatio, tone: 'neutral' as const },
      { label: selectedPoseLabel, tone: 'orange' as const },
    ]

  return (
    <StudioFormShell
      accent="orange"
      icon={<Layers size={18} />}
      title={title}
      chips={summaryChips}
      hideHeader
      layout="split"
      mediaColumnClassName="space-y-0"
      controlsColumnClassName="grid grid-cols-2 items-start gap-3 space-y-0"
      action={
        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72">
          {cost} CR
        </span>
      }
      media={
        <StudioPanel title={isProductVariant ? 'Modelo + produto' : 'Modelo + refs'}>
          {isProductVariant ? (
            <div className="grid gap-3 grid-cols-2">
              <div>
                {hasPortrait ? (
                  <div className="group relative overflow-hidden rounded-[16px] border border-white/8 bg-black/20">
                    <img src={portraitUrl} alt="Modelo base" className="aspect-[4/5] w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPortraitUrl('')}
                      className="absolute inset-x-0 bottom-0 flex h-12 items-end justify-between bg-gradient-to-t from-black/80 via-black/30 to-transparent px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/80 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <span>Modelo pronto</span>
                      <span className="text-white/58">Trocar</span>
                    </button>
                  </div>
                ) : (
                  <ImageUpload
                    value={portraitUrl}
                    onChange={setPortraitUrl}
                    label="Modelo"
                    accept="image/*"
                    compact
                    frameClassName="aspect-[4/5] min-h-[220px]"
                  />
                )}
              </div>
              <div>
                {hasProduct ? (
                  <div className="group relative overflow-hidden rounded-[16px] border border-white/8 bg-black/20">
                    <img src={productUrl} alt="Produto" className="aspect-[4/5] w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setProductUrl('')}
                      className="absolute inset-x-0 bottom-0 flex h-12 items-end justify-between bg-gradient-to-t from-black/80 via-black/30 to-transparent px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/80 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <span>Produto pronto</span>
                      <span className="text-white/58">Trocar</span>
                    </button>
                  </div>
                ) : (
                  <ImageUpload
                    value={productUrl}
                    onChange={setProductUrl}
                    label="Produto"
                    accept="image/*"
                    compact
                    frameClassName="aspect-[4/5] min-h-[220px]"
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-[190px_minmax(0,1fr)]">
              <div>
                {hasPortrait ? (
                  <div className="group relative overflow-hidden rounded-[16px] border border-white/8 bg-black/20">
                    <img src={portraitUrl} alt="Modelo base" className="aspect-[4/5] w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPortraitUrl('')}
                      className="absolute inset-x-0 bottom-0 flex h-12 items-end justify-between bg-gradient-to-t from-black/80 via-black/30 to-transparent px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/80 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <span>Modelo pronto</span>
                      <span className="text-white/58">Trocar</span>
                    </button>
                  </div>
                ) : (
                  <ImageUpload
                    value={portraitUrl}
                    onChange={setPortraitUrl}
                    label="Modelo"
                    accept="image/*"
                    compact
                    frameClassName="aspect-[4/5] min-h-[220px]"
                  />
                )}
              </div>

              <div className="space-y-2">
                <div className="rounded-[16px] border border-white/8 bg-black/10 p-2">
                  <ImageUpload
                    value={referenceUrls[0]}
                    onChange={(url) => setReferenceAt(0, url)}
                    label="Look principal"
                    accept="image/*"
                    compact
                    frameClassName="aspect-[16/9] min-h-[132px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[16px] border border-white/8 bg-black/10 p-2">
                    <ImageUpload
                      value={referenceUrls[1]}
                      onChange={(url) => setReferenceAt(1, url)}
                      label="Ref 2"
                      accept="image/*"
                      compact
                      frameClassName="aspect-[4/5] min-h-[138px]"
                    />
                  </div>
                  <div className="rounded-[16px] border border-white/8 bg-black/10 p-2">
                    <ImageUpload
                      value={referenceUrls[2]}
                      onChange={(url) => setReferenceAt(2, url)}
                      label="Ref 3"
                      accept="image/*"
                      compact
                      frameClassName="aspect-[4/5] min-h-[138px]"
                    />
                  </div>
                </div>
                <StudioHint>1 look ou ate 3 referencias.</StudioHint>
              </div>
            </div>
          )}
        </StudioPanel>
      }
      controls={
        <>
          <div className="col-span-2">
            <StudioPanel title="Quadro">
              <StudioFieldLabel>Formato</StudioFieldLabel>
              <SelectionGrid
                options={ASPECT_RATIO_PRESETS}
                selectedValue={aspectRatio}
                onSelect={setAspectRatio}
                columns="grid-cols-4"
              />
            </StudioPanel>
          </div>

          {!isProductVariant ? (
            <div className="col-span-1">
              <StudioPanel title="Look">
                <div className="space-y-3">
                  <div>
                    <StudioFieldLabel>Pose</StudioFieldLabel>
                    <PillGroup
                      options={FITTING_POSE_PRESETS}
                      selectedValue={fittingPosePreset}
                      onSelect={setFittingPosePreset}
                    />
                  </div>
                  <div>
                    <StudioFieldLabel>Energia</StudioFieldLabel>
                    <PillGroup
                      options={FITTING_ENERGY_PRESETS}
                      selectedValue={fittingEnergyPreset}
                      onSelect={setFittingEnergyPreset}
                    />
                  </div>
                </div>
              </StudioPanel>
            </div>
          ) : null}

          <div className="col-span-1">
            <StudioPanel title={isProductVariant ? 'Direcao' : 'Ajuste'}>
              <div className="space-y-3">
                {isProductVariant ? (
                  <div>
                    <StudioFieldLabel
                      trailing={
                        <button
                          type="button"
                          onClick={() => setSmartPrompt('')}
                          className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/40 transition-colors hover:text-white"
                        >
                          Limpar
                        </button>
                      }
                    >
                      Presets
                    </StudioFieldLabel>
                    <PillGroup
                      options={PRODUCT_PROMPT_CHIPS}
                      selectedValue=""
                      onSelect={(value) => applyProductPromptChip(value)}
                    />
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSmartPrompt('')}
                      className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/40 transition-colors hover:text-white"
                    >
                      Limpar
                    </button>
                  </div>
                )}

                <textarea
                  value={smartPrompt}
                  onChange={(event) => setSmartPrompt(event.target.value)}
                  placeholder={
                    isProductVariant
                      ? 'Ex: sorriso leve, produto na altura do peito, rotulo visivel.'
                      : 'Ex: pose frontal, mostrar melhor bolsa e oculos.'
                  }
                  rows={isProductVariant ? 5 : 8}
                  className="w-full resize-none rounded-[18px] border border-white/8 bg-[#0B0D0F] px-3.5 py-3 text-[12px] leading-relaxed text-white outline-none transition-colors placeholder:text-white/24 focus:border-orange-400/30"
                />
                <StudioHint tone="warning">
                  {isProductVariant
                    ? 'Para ambiente custom, use Cena Livre.'
                    : 'Nao muda modelagem, estampa ou ferragens das referencias.'}
                </StudioHint>
              </div>
            </StudioPanel>
          </div>

          <div className="col-span-2">
            <StudioPrimaryButton
              accent="orange"
              className="max-w-none"
              disabled={!hasPortrait || !hasProduct}
              onClick={() =>
                onGenerate(
                  isProductVariant
                    ? {
                      portrait_url: portraitUrl,
                      product_url: productUrl,
                      compose_mode: 'gemini',
                      compose_variant: variant,
                      position: DEFAULT_POSITION,
                      product_scale: DEFAULT_SCALE,
                      aspect_ratio: aspectRatio,
                      fitting_pose_preset: fittingPosePreset,
                      fitting_energy_preset: fittingEnergyPreset,
                      costume_prompt: '',
                      smart_prompt: smartPrompt,
                    }
                    : {
                      portrait_url: portraitUrl,
                      product_url: activeFittingReferenceUrls[0] ?? '',
                      product_urls: activeFittingReferenceUrls,
                      fitting_group: '',
                      compose_mode: 'gemini',
                      compose_variant: variant,
                      position: DEFAULT_POSITION,
                      product_scale: DEFAULT_SCALE,
                      aspect_ratio: aspectRatio,
                      fitting_pose_preset: fittingPosePreset,
                      fitting_energy_preset: fittingEnergyPreset,
                      costume_prompt: '',
                      smart_prompt: smartPrompt,
                    },
                )
              }
            >
              <Sparkles size={16} />
              {isProductVariant ? `Gerar modelo + produto - ${cost} CR` : `Gerar provador - ${cost} CR`}
            </StudioPrimaryButton>
          </div>
        </>
      }
    />
  )
}
