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

export default function ComposeCard({ initial, onGenerate }: Props) {
  const [portraitUrl, setPortraitUrl] = useState(String(initial.portrait_url ?? ''))
  const [productUrl, setProductUrl] = useState(String(initial.product_url ?? ''))
  const [position, setPosition] = useState(String(initial.position ?? 'southeast'))
  const [scale, setScale] = useState(Number(initial.product_scale ?? 0.35))
  const [category] = useState(String(initial.vton_category ?? 'tops'))
  const [smartPrompt, setSmartPrompt] = useState(String(initial.smart_prompt ?? ''))
  const variant = String(initial.compose_variant ?? 'fitting')

  const hasPortrait = !!portraitUrl.trim()
  const hasProduct = !!productUrl.trim()
  const cost = CREDIT_COST.compose
  const isProductVariant = variant === 'product'
  const title = isProductVariant ? 'Produto + Modelo' : 'Provador'
  const subtitle = isProductVariant
    ? 'Crie cenas comerciais com a modelo e o produto como protagonista.'
    : 'Vista, segure ou encene produtos com nosso motor proprietario.'
  const baseLabel = isProductVariant ? 'Modelo base' : 'Cena base'
  const promptLabel = isProductVariant
    ? 'Descreva a cena comercial - o Product One faz o resto'
    : 'Descreva a cena - o Provador One faz o resto'
  const promptPlaceholder = isProductVariant
    ? "Ex: 'A modelo segurando o serum na altura do rosto, enquadramento premium, fundo clean de estudio, produto em destaque absoluto, luz editorial suave'..."
    : "Ex: 'Segurando o pote com as duas maos na altura do peito, sorrindo' • 'Exibindo o produto levantado com uma mao, na praia ao por do sol' • 'Descansando no sofa segurando o produto, ambiente clean minimalista'..."
  const buttonLabel = isProductVariant ? 'INICIAR PRODUCT ONE' : 'INICIAR PROVADOR ONE'
  const engineName = isProductVariant ? 'Product One' : 'Provador One'

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
            <span className="text-[13px]">🧪</span>
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
                <img src={portraitUrl} alt="Cena base" className="h-full w-full object-cover" />
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
              <span className="text-[9px] font-bold uppercase tracking-tighter text-zinc-400">Produto</span>
              <ShieldCheck size={10} className="text-emerald-500" />
            </div>
            {hasProduct ? (
              <div className="group relative aspect-square w-full overflow-hidden rounded-lg border border-zinc-800">
                <img src={productUrl} alt="Produto" className="h-full w-full object-cover" />
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
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-[11px] text-white transition-all focus:outline-none focus:border-orange-500/50"
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

          <div className="space-y-2">
            <label className="block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              {promptLabel}
            </label>
            <textarea
              value={smartPrompt}
              onChange={(e) => setSmartPrompt(e.target.value)}
              placeholder={promptPlaceholder}
              rows={6}
              className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-[12px] leading-relaxed text-white placeholder-zinc-700 transition-all focus:border-orange-500/50 focus:outline-none"
            />
            <p className="px-1 text-[9px] italic leading-relaxed text-orange-400/80">Quanto mais detalhado, mais realista fica.</p>
          </div>
        </div>
      </div>

      <button
        onClick={() =>
          onGenerate({
            portrait_url: portraitUrl,
            product_url: productUrl,
            compose_mode: 'gemini',
            position,
            product_scale: scale,
            vton_category: category,
            costume_prompt: '',
            smart_prompt: smartPrompt,
            compose_variant: variant,
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
