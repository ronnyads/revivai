'use client'

import { useState } from 'react'
import { Layers, Sparkles, ChevronDown } from 'lucide-react'
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

function CompactSelect({
  value,
  onChange,
  options,
}: {
  options: { value: string; label: string; hint?: string }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-[16px] border border-white/8 bg-[#0B0D0F] px-3 py-2.5 pr-9 text-[11px] text-white outline-none transition-colors focus:border-orange-400/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.hint ? `${option.label} - ${option.hint}` : option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/38" />
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
  const [productPromptPreset, setProductPromptPreset] = useState('')

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
      controlsColumnClassName="grid grid-cols-2 items-start gap-2.5 space-y-0"
      action={
        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72">
          {cost} CR
        </span>
      }
      media={
        <StudioPanel title={isProductVariant ? 'Modelo + produto' : 'Modelo + refs'} compact>
          {isProductVariant ? (
            <div className="grid grid-cols-2 gap-2.5">
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
                    frameClassName="aspect-[4/5] min-h-[184px]"
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
                    frameClassName="aspect-[4/5] min-h-[184px]"
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[172px_minmax(0,1fr)] gap-2.5">
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
                    frameClassName="aspect-[4/5] min-h-[190px]"
                  />
                )}
              </div>

              <div className="space-y-2">
                <div className="rounded-[16px] border border-white/8 bg-black/10 p-1.5">
                  <ImageUpload
                    value={referenceUrls[0]}
                    onChange={(url) => setReferenceAt(0, url)}
                    label="Look principal"
                    accept="image/*"
                    compact
                    frameClassName="aspect-[16/9] min-h-[112px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[16px] border border-white/8 bg-black/10 p-1.5">
                    <ImageUpload
                      value={referenceUrls[1]}
                      onChange={(url) => setReferenceAt(1, url)}
                      label="Ref 2"
                      accept="image/*"
                      compact
                      frameClassName="aspect-[4/5] min-h-[112px]"
                    />
                  </div>
                  <div className="rounded-[16px] border border-white/8 bg-black/10 p-1.5">
                    <ImageUpload
                      value={referenceUrls[2]}
                      onChange={(url) => setReferenceAt(2, url)}
                      label="Ref 3"
                      accept="image/*"
                      compact
                      frameClassName="aspect-[4/5] min-h-[112px]"
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
          <div className={isProductVariant ? 'col-span-1' : 'col-span-2'}>
            <StudioPanel title="Configuracao" compact>
              <div className={`grid gap-3 ${isProductVariant ? '' : 'sm:grid-cols-3'}`}>
                <div>
                  <StudioFieldLabel>Formato</StudioFieldLabel>
                  <CompactSelect value={aspectRatio} onChange={setAspectRatio} options={ASPECT_RATIO_PRESETS} />
                </div>

                {!isProductVariant ? (
                  <>
                    <div>
                      <StudioFieldLabel>Pose</StudioFieldLabel>
                      <CompactSelect value={fittingPosePreset} onChange={setFittingPosePreset} options={FITTING_POSE_PRESETS} />
                    </div>
                    <div>
                      <StudioFieldLabel>Energia</StudioFieldLabel>
                      <CompactSelect value={fittingEnergyPreset} onChange={setFittingEnergyPreset} options={FITTING_ENERGY_PRESETS} />
                    </div>
                  </>
                ) : null}
              </div>
            </StudioPanel>
          </div>

          <div className={isProductVariant ? 'col-span-1' : 'col-span-2'}>
            <StudioPanel title={isProductVariant ? 'Direcao' : 'Ajuste'} compact>
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
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <CompactSelect
                        value={productPromptPreset}
                        onChange={setProductPromptPreset}
                        options={[
                          { value: '', label: 'Escolha um preset rapido' },
                          ...PRODUCT_PROMPT_CHIPS,
                        ]}
                      />
                      <button
                        type="button"
                        disabled={!productPromptPreset}
                        onClick={() => {
                          applyProductPromptChip(productPromptPreset)
                          setProductPromptPreset('')
                        }}
                        className="rounded-[16px] border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Adicionar
                      </button>
                    </div>
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
                  rows={isProductVariant ? 4 : 5}
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
