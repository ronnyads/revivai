'use client'

import { useState } from 'react'
import { Layers, ShieldCheck, Image as ImageIcon } from 'lucide-react'
import ImageUpload from './ImageUpload'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

const POSITIONS = [
  { value: 'southeast', label: 'Direita baixo' },
  { value: 'south',     label: 'Centro baixo'  },
  { value: 'southwest', label: 'Esquerda baixo' },
  { value: 'east',      label: 'Lado direito'  },
  { value: 'west',      label: 'Lado esquerdo' },
  { value: 'center',    label: 'Centro'        },
]

export default function ComposeCard({ initial, onGenerate }: Props) {
  const [portraitUrl, setPortraitUrl] = useState(String(initial.portrait_url ?? ''))
  const [productUrl,  setProductUrl]  = useState(String(initial.product_url  ?? ''))
  const [position,    setPosition]    = useState(String(initial.position     ?? 'southeast'))
  const [scale,       setScale]       = useState(Number(initial.product_scale ?? 0.35))

  const hasPortrait = !!portraitUrl.trim()
  const hasProduct  = !!productUrl.trim()
  const isConnected = !!initial.portrait_url

  return (
    <div className="flex flex-col gap-3">

      {/* Status cena/modelo */}
      <div className={`flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-xl border ${
        hasPortrait
          ? 'text-orange-400 bg-orange-500/10 border-orange-500/30'
          : 'text-zinc-500 bg-zinc-800/50 border-zinc-700/50'
      }`}>
        <ImageIcon size={11} />
        {isConnected ? 'Cena/Modelo conectado' : hasPortrait ? 'Cena definida' : 'Aguardando cena base...'}
      </div>

      {/* Upload da cena (fallback se não conectado) */}
      {!hasPortrait && (
        <ImageUpload
          value={portraitUrl}
          onChange={setPortraitUrl}
          label="Foto da cena ou modelo"
          accept="image/*"
          preview
        />
      )}

      {/* Produto do cliente — SEMPRE visível */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wide">Foto do produto</label>
          <div className="flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
            <ShieldCheck size={9} /> Preservado pixel-perfect
          </div>
        </div>
        <ImageUpload
          value={productUrl}
          onChange={setProductUrl}
          label=""
          accept="image/*"
          preview
        />
      </div>

      {/* Preview side-by-side */}
      {hasPortrait && hasProduct && (
        <div className="flex gap-2">
          <div className="flex-1 flex flex-col gap-1">
            <p className="text-[9px] text-zinc-500 uppercase tracking-wide">Cena</p>
            <img src={portraitUrl} alt="Cena" className="w-full rounded-xl object-cover aspect-square" />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <p className="text-[9px] text-zinc-500 uppercase tracking-wide">Produto</p>
            <img src={productUrl} alt="Produto" className="w-full rounded-xl object-cover aspect-square" />
          </div>
        </div>
      )}

      {/* Posição e tamanho */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Posição</label>
          <select
            value={position}
            onChange={e => setPosition(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-accent"
          >
            {POSITIONS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">
            Tamanho: {Math.round(scale * 100)}%
          </label>
          <input
            type="range" min="20" max="55" step="5"
            value={Math.round(scale * 100)}
            onChange={e => setScale(Number(e.target.value) / 100)}
            className="w-full accent-accent mt-2"
          />
        </div>
      </div>

      <button
        onClick={() => onGenerate({ portrait_url: portraitUrl, product_url: productUrl, position, product_scale: scale })}
        disabled={!hasPortrait || !hasProduct}
        className="flex items-center justify-center gap-2 bg-orange-700 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 w-full"
      >
        <Layers size={15} /> Compor cena — 1 crédito
      </button>
    </div>
  )
}
