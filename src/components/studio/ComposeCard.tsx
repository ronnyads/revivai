'use client'

import { useEffect, useState } from 'react'
import { Layers, ShieldCheck, Sparkles } from 'lucide-react'
import ImageUpload from './ImageUpload'
import { CREDIT_COST } from '@/constants/studio'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

const POSITIONS = [
  { value: 'southeast', label: 'Direita baixo' },
  { value: 'south', label: 'Centro baixo' },
  { value: 'southwest', label: 'Esquerda baixo' },
  { value: 'east', label: 'Lado direito' },
  { value: 'west', label: 'Lado esquerdo' },
  { value: 'center', label: 'Centro' },
]

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
  { value: 'showing-bag', label: 'Mostrando a bolsa' },
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

export default function ComposeCard({ initial, onGenerate }: Props) {
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
  const [position, setPosition] = useState(String(initial.position ?? 'southeast'))
  const [scale, setScale] = useState(Number(initial.product_scale ?? 0.35))
  const [aspectRatio, setAspectRatio] = useState(String(initial.aspect_ratio ?? '9:16'))
  const [fittingPosePreset, setFittingPosePreset] = useState(String(initial.fitting_pose_preset ?? getDefaultFittingPose(initialFittingCategory || 'tops')))
  const [fittingEnergyPreset, setFittingEnergyPreset] = useState(String(initial.fitting_energy_preset ?? 'natural'))
  const [smartPrompt, setSmartPrompt] = useState(String(initial.smart_prompt ?? ''))

  useEffect(() => {
    setPortraitUrl(String(initial.portrait_url ?? ''))
  }, [initial.portrait_url])

  useEffect(() => {
    setProductUrl(String(initial.product_url ?? ''))
  }, [initial.product_url])

  useEffect(() => {
    const nextReferenceUrls = Array.isArray(initial.product_urls)
      ? initial.product_urls
        .filter((value): value is string => typeof value === 'string')
        .slice(0, 3)
      : []
    while (nextReferenceUrls.length < 3) nextReferenceUrls.push('')

    setReferenceUrls(
      nextReferenceUrls.some((url) => url.trim().length > 0)
        ? nextReferenceUrls
        : [String(initial.product_url ?? ''), '', ''],
    )
  }, [initial.product_url, initial.product_urls])

  useEffect(() => {
    setAspectRatio(String(initial.aspect_ratio ?? '9:16'))
  }, [initial.aspect_ratio])

  useEffect(() => {
    setFittingPosePreset(String(initial.fitting_pose_preset ?? getDefaultFittingPose(initialFittingCategory || 'tops')))
  }, [initial.fitting_pose_preset, initialFittingCategory])

  useEffect(() => {
    setFittingEnergyPreset(String(initial.fitting_energy_preset ?? 'natural'))
  }, [initial.fitting_energy_preset])

  useEffect(() => {
    setSmartPrompt(String(initial.smart_prompt ?? ''))
  }, [initial.smart_prompt])

  const hasPortrait = !!portraitUrl.trim()
  const isProductVariant = variant === 'product'
  const fittingReferenceUrls = referenceUrls.map((url) => url.trim())
  const activeFittingReferenceUrls = fittingReferenceUrls.filter(Boolean)
  const hasProduct = isProductVariant ? !!productUrl.trim() : activeFittingReferenceUrls.length > 0
  const cost = CREDIT_COST.compose
  const title = isProductVariant ? 'Modelo + Produto' : 'Provador'
  const subtitle = isProductVariant
    ? 'Foto comercial clean em fundo branco, com a modelo exibindo o produto sem cenario.'
    : 'Monte a modelo com a peca exata do cliente. Use 1 foto de colecao/look ou ate 3 referencias separadas para roupa, calcado e acessorios.'
  const baseLabel = 'Modelo base'
  const productLabel = isProductVariant ? 'Produto' : 'Colecao / Referencias'
  const promptLabel = isProductVariant
    ? 'Direcao leve da pose e exibicao'
    : 'Ajuste leve de pose e exibicao'
  const promptPlaceholder = isProductVariant
    ? "Ex: 'Sorrindo de leve, segurando o serum perto do rosto com o rotulo visivel'; 'Pose comercial clean, produto na altura do peito, olhar confiante'..."
    : "Ex: 'pose frontal com a peca bem visivel', 'sorriso suave', 'mostrar melhor a bolsa sem esconder a alca'..."
  const buttonLabel = isProductVariant ? 'INICIAR PRODUCT ONE' : 'INICIAR PROVADOR ONE'
  const engineName = isProductVariant ? 'Product One' : 'Provador One'

  function setReferenceAt(index: number, url: string) {
    setReferenceUrls((current) => current.map((value, itemIndex) => itemIndex === index ? url : value))
  }
  const cardEngineBlock = (
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-900/40 ${isProductVariant ? 'p-2.5' : 'p-2'}`}>
      <label className="mb-1 block px-1 text-[9px] font-bold uppercase tracking-widest text-zinc-400">Motor</label>
      <div className={`flex w-full items-center justify-between rounded-xl border border-orange-500/30 bg-zinc-800 text-white ${isProductVariant ? 'px-3 py-2 text-[12px]' : 'px-2.5 py-2 text-[11px]'}`}>
        <div className="flex items-center gap-2">
          <span className="text-[13px]">Studio</span>
          <span>{engineName}</span>
        </div>
        <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-orange-300">
          unico
        </span>
      </div>
    </div>
  )

  function applyProductPromptChip(value: string) {
    setSmartPrompt((current) => {
      const trimmed = current.trim()
      if (trimmed.toLowerCase().includes(value.toLowerCase())) return current
      return trimmed ? `${trimmed}; ${value}` : value
    })
  }

  function renderFittingPresetGroup(
    titleText: string,
    options: { value: string; label: string }[],
    selectedValue: string,
    onSelect: (value: string) => void,
  ) {
    return (
      <div className="space-y-2">
        <span className="block px-1 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-400">{titleText}</span>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const selected = selectedValue === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelect(option.value)}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all ${
                  selected
                    ? 'border-orange-400/50 bg-orange-500/20 text-white'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-orange-400/30 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col ${isProductVariant ? 'gap-4' : 'gap-3'}`}>
      {isProductVariant ? (
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
          <div className="rounded-xl bg-orange-500/10 p-2">
            <Layers size={16} className="text-orange-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-[12px] font-bold leading-tight text-white">{title}</h4>
            <p className="text-[10px] leading-tight text-zinc-400">{subtitle}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/35 px-3 py-2">
          <p className="text-[10px] leading-relaxed text-zinc-400">{subtitle}</p>
        </div>
      )}

      {isProductVariant && cardEngineBlock}

      <div className={`grid gap-3 ${isProductVariant ? 'md:grid-cols-[220px_minmax(0,1fr)]' : 'xl:grid-cols-[200px_minmax(0,1fr)]'}`}>
        <div className="space-y-3">
          <div className={`flex flex-col items-center gap-2 rounded-2xl border transition-all ${hasPortrait ? 'border-orange-500/20 bg-orange-500/5' : 'border-zinc-800 bg-zinc-900'} ${isProductVariant ? 'p-2' : 'p-1.5'}`}>
            <span className="text-[9px] font-bold uppercase tracking-tighter text-zinc-400">{baseLabel}</span>
            {hasPortrait ? (
              <div className="group relative aspect-[4/5] w-full overflow-hidden rounded-lg border border-zinc-800">
                <img src={portraitUrl} alt="Modelo base" className="h-full w-full object-cover" />
                <button
                  onClick={() => setPortraitUrl('')}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <ImageUpload value={portraitUrl} onChange={setPortraitUrl} label="Subir" accept="image/*" />
            )}
          </div>

          {isProductVariant ? (
            <div className={`flex flex-col items-center gap-2 rounded-2xl border transition-all ${hasProduct ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900'} p-2`}>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold uppercase tracking-tighter text-zinc-400">{productLabel}</span>
                <ShieldCheck size={10} className="text-emerald-500" />
              </div>
              {hasProduct ? (
                <div className="group relative aspect-square w-full overflow-hidden rounded-lg border border-zinc-800">
                  <img src={productUrl} alt={productLabel} className="h-full w-full object-cover" />
                  <button
                    onClick={() => setProductUrl('')}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <ImageUpload value={productUrl} onChange={setProductUrl} label="Subir" accept="image/*" />
              )}
            </div>
          ) : (
            <div className={`rounded-2xl border transition-all ${hasProduct ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900'} p-1.5`}>
              <div className="mb-2 flex items-center gap-1 px-1">
                <span className="text-[9px] font-bold uppercase tracking-tighter text-zinc-400">{productLabel}</span>
                <ShieldCheck size={10} className="text-emerald-500" />
              </div>
              <div className="space-y-2">
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-1.5">
                  <ImageUpload value={referenceUrls[0]} onChange={(url) => setReferenceAt(0, url)} label="Referencia principal ou foto da colecao" accept="image/*" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/30 p-1.5">
                    <ImageUpload value={referenceUrls[1]} onChange={(url) => setReferenceAt(1, url)} label="Referencia extra 2" accept="image/*" />
                  </div>
                  <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/30 p-1.5">
                    <ImageUpload value={referenceUrls[2]} onChange={(url) => setReferenceAt(2, url)} label="Referencia extra 3" accept="image/*" />
                  </div>
                </div>
                <p className="px-1 text-[9px] leading-relaxed text-zinc-500">
                  Melhor resultado: envie ate 3 referencias separadas. Se tiver so 1 imagem de colecao/look, o Provador identifica automaticamente se deve tratar como look completo ou referencias separadas.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className={`${isProductVariant ? 'space-y-3' : 'space-y-2.5'}`}>
          {!isProductVariant && cardEngineBlock}

          <div className={`rounded-2xl border border-zinc-800 bg-zinc-900/40 ${isProductVariant ? 'space-y-3 p-3' : 'space-y-2.5 p-2.5'}`}>
            <div className={`grid gap-3 ${isProductVariant ? 'grid-cols-2' : 'sm:grid-cols-2'}`}>
              <div className="space-y-2">
                <label className="block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Posicao</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-[11px] text-white transition-all focus:border-orange-500/50 focus:outline-none"
                >
                  {POSITIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {isProductVariant ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Tamanho</label>
                    <span className="text-[10px] font-bold text-orange-400">{Math.round(scale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="55"
                    step="1"
                    value={Math.round(scale * 100)}
                    onChange={(e) => setScale(Number(e.target.value) / 100)}
                    className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-orange-500"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Formato final</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ASPECT_RATIO_PRESETS.map((preset) => {
                      const selected = aspectRatio === preset.value
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setAspectRatio(preset.value)}
                          className={`rounded-xl border px-3 py-2 text-left transition-all ${
                            selected
                              ? 'border-orange-400/50 bg-orange-500/15 text-white'
                              : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-orange-400/30 hover:text-white'
                          }`}
                        >
                          <span className="block text-[10px] font-semibold">{preset.label}</span>
                          <span className="block text-[9px] text-zinc-400">{preset.hint}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {!isProductVariant && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Tamanho</label>
                  <span className="text-[10px] font-bold text-orange-400">{Math.round(scale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="55"
                  step="1"
                  value={Math.round(scale * 100)}
                  onChange={(e) => setScale(Number(e.target.value) / 100)}
                  className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-orange-500"
                />
                <p className="px-1 text-[9px] leading-relaxed text-zinc-500">
                  O formato escolhido muda o enquadramento real da imagem. O tamanho controla a proximidade da peca no frame.
                </p>
              </div>
            )}
          </div>

          {!isProductVariant && (
            <div className="space-y-2.5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-2.5">
              {renderFittingPresetGroup('Pose', FITTING_POSE_PRESETS, fittingPosePreset, setFittingPosePreset)}
              {renderFittingPresetGroup('Energia', FITTING_ENERGY_PRESETS, fittingEnergyPreset, setFittingEnergyPreset)}
            </div>
          )}

          <div className={`${isProductVariant ? 'space-y-2' : 'space-y-1.5'}`}>
            <label className="block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              {promptLabel}
            </label>
            {isProductVariant ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-400">Presets rapidos</span>
                  <button
                    type="button"
                    onClick={() => setSmartPrompt('')}
                    className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500 transition-colors hover:text-white"
                  >
                    Limpar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_PROMPT_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => applyProductPromptChip(chip.value)}
                      className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-[10px] font-medium text-orange-200 transition-all hover:border-orange-400/40 hover:bg-orange-500/20 hover:text-white"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[9px] leading-relaxed text-zinc-500">
                  Os chips so ajustam pose, exibicao e expressao. O fundo branco continua fixo.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-2.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-400">Refinamento leve</span>
                  <button
                    type="button"
                    onClick={() => setSmartPrompt('')}
                    className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500 transition-colors hover:text-white"
                  >
                    Limpar
                  </button>
                </div>
                <p className="text-[9px] leading-relaxed text-zinc-500">
                  A peca enviada manda no look. Use o campo abaixo apenas para pequenos ajustes de pose, expressao, enquadramento e visibilidade.
                </p>
              </div>
            )}
            <textarea
              value={smartPrompt}
              onChange={(e) => setSmartPrompt(e.target.value)}
              placeholder={promptPlaceholder}
              rows={isProductVariant ? 6 : 4}
              className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-[12px] leading-relaxed text-white placeholder-zinc-700 transition-all focus:border-orange-500/50 focus:outline-none"
            />
            <p className="px-1 text-[9px] italic leading-relaxed text-orange-400/80">
              {isProductVariant
                ? 'Esse card ignora cenario, fundo e styling editorial. Use Cena Livre para ambientes personalizados.'
                : 'Pose, energia e formato nunca podem mudar modelagem, estampa, recortes, alcas, comprimento, ferragens ou proporcoes da peca enviada.'}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() =>
          onGenerate(
            isProductVariant
              ? {
                portrait_url: portraitUrl,
                product_url: productUrl,
                compose_mode: 'gemini',
                compose_variant: variant,
                position,
                product_scale: scale,
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
                compose_mode: 'vertex-vto',
                compose_variant: variant,
                position,
                product_scale: scale,
                aspect_ratio: aspectRatio,
                fitting_pose_preset: fittingPosePreset,
                fitting_energy_preset: fittingEnergyPreset,
                costume_prompt: '',
                smart_prompt: smartPrompt,
              }
          )
        }
        disabled={!hasPortrait || !hasProduct}
        className={`group relative ${isProductVariant ? 'mt-2 py-4 text-[13px]' : 'py-3.5 text-[12px]'} flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 font-bold text-white shadow-[0_10px_30px_-10px_rgba(234,88,12,0.5)] transition-all active:scale-[0.98] disabled:opacity-40`}
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
        <Sparkles size={18} className="transition-transform group-hover:rotate-12" />
        {buttonLabel} - {cost} CREDITOS
      </button>
    </div>
  )
}
