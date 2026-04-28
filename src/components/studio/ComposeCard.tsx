'use client'

import { useState } from 'react'
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

const FASHION_CATEGORY_OPTIONS = [
  { value: 'tops', label: 'Blusa / Camisa' },
  { value: 'bottoms', label: 'Calca / Saia' },
  { value: 'one-pieces', label: 'Vestido / Macacao' },
  { value: 'outerwear', label: 'Jaqueta / Casaco' },
  { value: 'bags', label: 'Bolsa' },
  { value: 'glasses', label: 'Oculos' },
  { value: 'jewelry', label: 'Joia' },
  { value: 'shoes', label: 'Sapato' },
]

const PRODUCT_PROMPT_CHIPS = [
  { label: 'Perto do rosto', value: 'produto perto do rosto, rotulo visivel' },
  { label: 'Na altura do peito', value: 'produto na altura do peito, bem visivel' },
  { label: 'Com duas maos', value: 'segurando com as duas maos, apresentacao estavel' },
  { label: 'Apontando detalhe', value: 'uma mao segurando e a outra apontando detalhes do produto' },
  { label: 'Sorriso suave', value: 'sorriso suave e natural' },
  { label: 'Olhar confiante', value: 'olhar confiante para a camera' },
]

const FITTING_STYLE_PRESETS = [
  { value: 'casual', label: 'Casual' },
  { value: 'premium', label: 'Premium' },
  { value: 'elegante', label: 'Elegante' },
  { value: 'street', label: 'Street' },
  { value: 'minimalista', label: 'Minimalista' },
  { value: 'fashion-clean', label: 'Fashion clean' },
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

function getDefaultFittingPose(category: string): string {
  switch (category) {
    case 'bottoms':
    case 'one-pieces':
    case 'shoes':
      return 'full-body'
    case 'outerwear':
      return 'standing'
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
  const initialFittingCategory = String(initial.fitting_category ?? initial.vton_category ?? 'tops')

  const [portraitUrl, setPortraitUrl] = useState(String(initial.portrait_url ?? ''))
  const [productUrl, setProductUrl] = useState(String(initial.product_url ?? ''))
  const [position, setPosition] = useState(String(initial.position ?? 'southeast'))
  const [scale, setScale] = useState(Number(initial.product_scale ?? 0.35))
  const [fashionCategory, setFashionCategory] = useState(initialFittingCategory)
  const [fittingStylePreset, setFittingStylePreset] = useState(String(initial.fitting_style_preset ?? 'fashion-clean'))
  const [fittingPosePreset, setFittingPosePreset] = useState(String(initial.fitting_pose_preset ?? getDefaultFittingPose(initialFittingCategory)))
  const [fittingEnergyPreset, setFittingEnergyPreset] = useState(String(initial.fitting_energy_preset ?? 'natural'))
  const [smartPrompt, setSmartPrompt] = useState(String(initial.smart_prompt ?? ''))

  const hasPortrait = !!portraitUrl.trim()
  const hasProduct = !!productUrl.trim()
  const cost = CREDIT_COST.compose
  const isProductVariant = variant === 'product'
  const title = isProductVariant ? 'Modelo + Produto' : 'Provador'
  const subtitle = isProductVariant
    ? 'Foto comercial clean em fundo branco, com a modelo exibindo o produto sem cenario.'
    : 'Vista a modelo com roupa e acessorios usando presets de look, pose e energia.'
  const baseLabel = 'Modelo base'
  const productLabel = isProductVariant ? 'Produto' : 'Peca / Acessorio'
  const promptLabel = isProductVariant
    ? 'Direcao leve da pose e exibicao'
    : 'Ajuste fino do look'
  const promptPlaceholder = isProductVariant
    ? "Ex: 'Sorrindo de leve, segurando o serum perto do rosto com o rotulo visivel'; 'Pose comercial clean, produto na altura do peito, olhar confiante'..."
    : "Ex: 'caimento mais alinhado no ombro', 'bolsa um pouco mais visivel', 'atitude mais premium sem mudar a identidade'..."
  const buttonLabel = isProductVariant ? 'INICIAR PRODUCT ONE' : 'INICIAR PROVADOR ONE'
  const engineName = isProductVariant ? 'Product One' : 'Provador One'

  function applyProductPromptChip(value: string) {
    setSmartPrompt((current) => {
      const trimmed = current.trim()
      if (trimmed.toLowerCase().includes(value.toLowerCase())) return current
      return trimmed ? `${trimmed}; ${value}` : value
    })
  }

  function updateFashionCategory(nextCategory: string) {
    setFashionCategory(nextCategory)
    setFittingPosePreset(getDefaultFittingPose(nextCategory))
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <div className="rounded-xl bg-orange-500/10 p-2">
          <Layers size={16} className="text-orange-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-[12px] font-bold leading-tight text-white">{title}</h4>
          <p className="text-[10px] leading-tight text-zinc-400">{subtitle}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-2.5">
        <label className="mb-1.5 block px-1 text-[9px] font-bold uppercase tracking-widest text-zinc-400">Motor</label>
        <div className="flex w-full items-center justify-between rounded-xl border border-orange-500/30 bg-zinc-800 px-3 py-2 text-[12px] text-white">
          <div className="flex items-center gap-2">
            <span className="text-[13px]">Studio</span>
            <span>{engineName}</span>
          </div>
          <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-orange-300">
            unico
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className={`flex flex-col items-center gap-2 rounded-2xl border p-2 transition-all ${hasPortrait ? 'border-orange-500/20 bg-orange-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
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

          <div className={`flex flex-col items-center gap-2 rounded-2xl border p-2 transition-all ${hasProduct ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
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
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
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
          </div>

          {!isProductVariant && (
            <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="space-y-2">
                <label className="block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Categoria fashion</label>
                <select
                  value={fashionCategory}
                  onChange={(e) => updateFashionCategory(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-[11px] text-white transition-all focus:border-orange-500/50 focus:outline-none"
                >
                  {FASHION_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {renderFittingPresetGroup('Look', FITTING_STYLE_PRESETS, fittingStylePreset, setFittingStylePreset)}
              {renderFittingPresetGroup('Pose', FITTING_POSE_PRESETS, fittingPosePreset, setFittingPosePreset)}
              {renderFittingPresetGroup('Energia', FITTING_ENERGY_PRESETS, fittingEnergyPreset, setFittingEnergyPreset)}
            </div>
          )}

          <div className="space-y-2">
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
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
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
                  Use o campo abaixo para pequenos ajustes de caimento, atitude ou exibicao. Os presets continuam mandando na estrutura do look.
                </p>
              </div>
            )}
            <textarea
              value={smartPrompt}
              onChange={(e) => setSmartPrompt(e.target.value)}
              placeholder={promptPlaceholder}
              rows={6}
              className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-[12px] leading-relaxed text-white placeholder-zinc-700 transition-all focus:border-orange-500/50 focus:outline-none"
            />
            <p className="px-1 text-[9px] italic leading-relaxed text-orange-400/80">
              {isProductVariant
                ? 'Esse card ignora cenario, fundo e styling editorial. Use Cena Livre para ambientes personalizados.'
                : 'Os presets definem o look principal. O texto livre funciona melhor para ajustes finos de pose, energia e encaixe.'}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() =>
          onGenerate({
            portrait_url: portraitUrl,
            product_url: productUrl,
            compose_mode: 'gemini',
            compose_variant: variant,
            position,
            product_scale: scale,
            vton_category: fashionCategory,
            fitting_category: fashionCategory,
            fitting_style_preset: fittingStylePreset,
            fitting_pose_preset: fittingPosePreset,
            fitting_energy_preset: fittingEnergyPreset,
            costume_prompt: '',
            smart_prompt: smartPrompt,
          })
        }
        disabled={!hasPortrait || !hasProduct}
        className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 py-4 text-[13px] font-bold text-white shadow-[0_10px_30px_-10px_rgba(234,88,12,0.5)] transition-all active:scale-[0.98] disabled:opacity-40"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
        <Sparkles size={18} className="transition-transform group-hover:rotate-12" />
        {buttonLabel} - {cost} CREDITOS
      </button>
    </div>
  )
}
