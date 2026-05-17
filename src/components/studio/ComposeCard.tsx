'use client'

import { useState } from 'react'
import { Layers, Sparkles, ChevronDown } from 'lucide-react'
import ImageUpload from './ImageUpload'
import { STUDIO_ASPECT_RATIO_PRESETS } from './aspectRatio'
import { CREDIT_COST } from '@/constants/studio'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

const DEFAULT_POSITION = 'southeast'
const DEFAULT_SCALE = 0.35

const FITTING_POSE_PRESETS = [
  { value: 'frontal',          label: 'Frontal'         },
  { value: 'three-quarter',    label: '3/4'             },
  { value: 'full-body',        label: 'Full body'       },
  { value: 'seated',           label: 'Sentada'         },
  { value: 'standing',         label: 'Em pé'           },
  { value: 'hand-in-pocket',   label: 'Mão no bolso'   },
  { value: 'showing-bag',      label: 'Mostrando bolsa' },
  { value: 'adjusting-glasses',label: 'Ajust. óculos'  },
]

const FITTING_ENERGY_PRESETS = [
  { value: 'confiante',      label: 'Confiante'      },
  { value: 'natural',        label: 'Natural'        },
  { value: 'sorriso-suave',  label: 'Sorriso suave'  },
  { value: 'editorial-leve', label: 'Editorial leve' },
]

function getDefaultPose(category: string): string {
  switch (category) {
    case 'bottoms': case 'one-pieces': case 'shoes': return 'full-body'
    case 'outerwear': return 'standing'
    case 'headwear': case 'jewelry': return 'frontal'
    case 'bags': return 'showing-bag'
    case 'glasses': return 'adjusting-glasses'
    default: return 'three-quarter'
  }
}

function Select({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-white/8 bg-zinc-900 px-3 py-2.5 pr-8 text-[12px] text-white outline-none focus:border-orange-400/30 transition-colors"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40" />
    </div>
  )
}

export default function ComposeCard({ initial, onGenerate }: Props) {
  const syncKey = JSON.stringify({
    portrait_url:          initial.portrait_url          ?? '',
    product_url:           initial.product_url           ?? '',
    product_urls:          Array.isArray(initial.product_urls) ? initial.product_urls : [],
    aspect_ratio:          initial.aspect_ratio          ?? '9:16',
    fitting_pose_preset:   initial.fitting_pose_preset   ?? '',
    fitting_energy_preset: initial.fitting_energy_preset ?? '',
    smart_prompt:          initial.smart_prompt          ?? '',
  })
  return <ComposeCardBody key={syncKey} initial={initial} onGenerate={onGenerate} />
}

function ComposeCardBody({ initial, onGenerate }: Props) {
  const variant = String(initial.compose_variant ?? 'fitting')
  const isProduct = variant === 'product'

  const initialCategory = typeof initial.fitting_category === 'string'
    ? initial.fitting_category
    : typeof initial.vton_category === 'string' ? initial.vton_category : ''

  const initialRefs = (() => {
    const arr = Array.isArray(initial.product_urls)
      ? initial.product_urls.filter((v): v is string => typeof v === 'string').slice(0, 3)
      : []
    while (arr.length < 3) arr.push('')
    return arr
  })()

  const [portraitUrl, setPortraitUrl] = useState(String(initial.portrait_url ?? ''))
  const [productUrl,  setProductUrl]  = useState(String(initial.product_url  ?? ''))
  const [refs, setRefs]               = useState<string[]>(
    initialRefs.some(u => u.trim()) ? initialRefs : [String(initial.product_url ?? ''), '', ''],
  )
  const [aspectRatio,    setAspectRatio]    = useState(String(initial.aspect_ratio          ?? '9:16'))
  const [posePreset,     setPosePreset]     = useState(String(initial.fitting_pose_preset   ?? getDefaultPose(initialCategory || 'tops')))
  const [energyPreset,   setEnergyPreset]   = useState(String(initial.fitting_energy_preset ?? 'natural'))
  const [smartPrompt,    setSmartPrompt]    = useState(String(initial.smart_prompt          ?? ''))

  const hasPortrait   = !!portraitUrl.trim()
  const activeRefs    = refs.map(u => u.trim()).filter(Boolean)
  const hasProduct    = isProduct ? !!productUrl.trim() : activeRefs.length > 0
  const cost          = isProduct ? CREDIT_COST.compose : 24
  const title         = isProduct ? 'Modelo + Produto' : 'Provador'

  function setRefAt(i: number, url: string) {
    setRefs(prev => prev.map((v, idx) => idx === i ? url : v))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-orange-500/20 rounded-xl mt-0.5">
          <Layers size={18} className="text-orange-400" />
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-white leading-tight">{title}</h4>
          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
            {isProduct ? 'Coloca o produto nas mãos do modelo.' : 'Veste a peça no modelo com IA.'}
          </p>
        </div>
      </div>

      {/* Imagens */}
      {isProduct ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1 mb-1.5 block">Modelo</label>
            <ImageUpload value={portraitUrl} onChange={setPortraitUrl} label="Modelo" accept="image/*" compact frameClassName="aspect-[4/5] min-h-[140px]" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1 mb-1.5 block">Produto</label>
            <ImageUpload value={productUrl} onChange={setProductUrl} label="Produto" accept="image/*" compact frameClassName="aspect-[4/5] min-h-[140px]" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1 mb-0.5 block">Modelo</label>
          <ImageUpload value={portraitUrl} onChange={setPortraitUrl} label="Modelo" accept="image/*" compact frameClassName="aspect-[4/5] min-h-[160px]" />

          <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1 mt-1 mb-0.5 block">Look / Referências</label>
          <ImageUpload value={refs[0]} onChange={url => setRefAt(0, url)} label="Look principal" accept="image/*" compact frameClassName="aspect-video min-h-[100px]" />
          <div className="grid grid-cols-2 gap-2">
            <ImageUpload value={refs[1]} onChange={url => setRefAt(1, url)} label="Ref 2 (opcional)" accept="image/*" compact frameClassName="aspect-[4/5] min-h-[90px]" />
            <ImageUpload value={refs[2]} onChange={url => setRefAt(2, url)} label="Ref 3 (opcional)" accept="image/*" compact frameClassName="aspect-[4/5] min-h-[90px]" />
          </div>
          {activeRefs.length > 1 && (
            <p className="text-[10px] text-zinc-500 px-1">Até 3 referências — mesclamos antes de gerar.</p>
          )}
        </div>
      )}

      {/* Configuração */}
      <div className={`grid gap-3 ${isProduct ? 'grid-cols-1' : 'grid-cols-3'}`}>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1 mb-1.5 block">Formato</label>
          <Select value={aspectRatio} onChange={setAspectRatio} options={STUDIO_ASPECT_RATIO_PRESETS} />
        </div>
        {!isProduct && (
          <>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1 mb-1.5 block">Pose</label>
              <Select value={posePreset} onChange={setPosePreset} options={FITTING_POSE_PRESETS} />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1 mb-1.5 block">Energia</label>
              <Select value={energyPreset} onChange={setEnergyPreset} options={FITTING_ENERGY_PRESETS} />
            </div>
          </>
        )}
      </div>

      {/* Ajuste / Smart Prompt */}
      <div>
        <div className="flex items-center justify-between px-1 mb-1.5">
          <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
            {isProduct ? 'Direção' : 'Ajuste'}
          </label>
          {smartPrompt && (
            <button onClick={() => setSmartPrompt('')} className="text-[9px] text-zinc-600 hover:text-white uppercase tracking-widest transition-colors">
              Limpar
            </button>
          )}
        </div>
        <textarea
          value={smartPrompt}
          onChange={e => setSmartPrompt(e.target.value)}
          placeholder={isProduct ? 'Ex: produto perto do rosto, rótulo visível.' : 'Ex: pose frontal, mostrar melhor bolsa e óculos.'}
          rows={3}
          className="w-full resize-none rounded-2xl border border-zinc-700/60 bg-zinc-900 px-4 py-3 text-[12px] text-white placeholder-zinc-600 outline-none focus:border-orange-400/30 transition-colors leading-relaxed"
        />
      </div>

      {/* Botão */}
      <button
        disabled={!hasPortrait || !hasProduct}
        onClick={() => onGenerate(
          isProduct ? {
            portrait_url: portraitUrl, product_url: productUrl,
            compose_mode: 'gemini', compose_variant: variant,
            position: DEFAULT_POSITION, product_scale: DEFAULT_SCALE,
            aspect_ratio: aspectRatio, fitting_pose_preset: posePreset,
            fitting_energy_preset: energyPreset, costume_prompt: '', smart_prompt: smartPrompt,
          } : {
            portrait_url: portraitUrl, product_url: activeRefs[0] ?? '',
            product_urls: activeRefs, fitting_group: '',
            compose_mode: 'gemini', compose_variant: variant,
            position: DEFAULT_POSITION, product_scale: DEFAULT_SCALE,
            aspect_ratio: aspectRatio, fitting_pose_preset: posePreset,
            fitting_energy_preset: energyPreset, costume_prompt: '', smart_prompt: smartPrompt,
          }
        )}
        className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-[13px] font-bold px-4 py-4 rounded-2xl transition-all disabled:opacity-40 w-full shadow-[0_10px_30px_-10px_rgba(234,88,12,0.5)] active:scale-[0.98] overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Sparkles size={18} className="group-hover:scale-110 transition-transform" />
        {isProduct ? `GERAR MODELO + PRODUTO — ${cost} CR` : `GERAR PROVADOR — ${cost} CR`}
      </button>
    </div>
  )
}
