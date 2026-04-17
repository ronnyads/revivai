'use client'

import { useState } from 'react'
import { Sparkles, User, ChevronDown } from 'lucide-react'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

const PRESETS = [
  {
    value: 'influencer_realista',
    label: 'Influencer Realista',
    style: 'ugc',
    hint: 'Ex: influencer feminina sorridente, iluminação natural, fundo desfocado, câmera frontal...',
  },
  {
    value: 'influencer_ugc',
    label: 'Influencer UGC',
    style: 'ugc',
    hint: 'Ex: criadora de conteúdo segurando produto, fundo neutro, estilo casual autêntico...',
  },
  {
    value: 'clone',
    label: 'Clonar Rosto do Modelo',
    style: 'ugc',
    hint: 'Conecte um card Modelo UGC para manter a mesma persona na cena',
  },
  {
    value: 'produto_realista',
    label: 'Produto Realista',
    style: 'product',
    hint: 'Ex: foto profissional do produto em fundo branco, iluminação de estúdio, alta definição...',
  },
  {
    value: 'logo',
    label: 'Logo Profissional',
    style: 'logo',
    hint: 'Ex: logo minimalista, letras modernas, paleta de 2 cores, fundo transparente...',
  },
  {
    value: 'aleatoria',
    label: 'Imagem Aleatória',
    style: 'lifestyle',
    hint: 'Ex: cena lifestyle, luz natural, composição equilibrada, cores vibrantes...',
  },
  {
    value: 'mascote',
    label: 'Mascote / Avatar 3D (Clone)',
    style: 'mascote',
    hint: 'Ex: O golfinho bebendo café, cena 3d, iluminação de cinema...',
  },
]

const RATIOS = [
  { value: '9:16', label: '9:16 — Reels/Story' },
  { value: '1:1',  label: '1:1 — Feed'         },
  { value: '16:9', label: '16:9 — YouTube'      },
  { value: '4:3',  label: '4:3 — Paisagem'      },
  { value: '3:4',  label: '3:4 — Retrato'       },
]

export default function ImageGenerator({ initial, onGenerate }: Props) {
  const [preset, setPreset] = useState('influencer_realista')
  const [prompt, setPrompt] = useState(String(initial.prompt ?? ''))
  const [aspect, setAspect] = useState(String(initial.aspect_ratio ?? '9:16'))
  const [open,   setOpen]   = useState(false)

  const selected = PRESETS.find(p => p.value === preset) ?? PRESETS[0]

  function handlePreset(p: typeof PRESETS[0]) {
    setPreset(p.value)
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Indicadores de conexão */}
      <div className="flex flex-wrap gap-2">
        {!!initial.model_prompt && (
          <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1.5 rounded-xl">
            <User size={11} /> Modelo conectado
          </div>
        )}
        {!!initial.source_face_url && (
          <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1.5 rounded-xl">
            <User size={11} /> Rosto Real conectado
          </div>
        )}
      </div>

      {/* Preset selector */}
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1.5 block">O que você quer gerar?</label>
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="w-full flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none hover:border-zinc-600 transition-colors"
          >
            <span>{selected.label}</span>
            <ChevronDown size={14} className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute left-0 right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-20 overflow-hidden">
                {PRESETS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => handlePreset(p)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors hover:bg-zinc-800 ${
                      preset === p.value ? 'text-violet-400 bg-violet-500/10' : 'text-zinc-300'
                    }`}
                  >
                    {preset === p.value && <span className="text-violet-400 text-xs">✓</span>}
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Prompt */}
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder={selected.hint}
        rows={3}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-accent"
      />

      {/* Proporção */}
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Proporção</label>
        <div className="grid grid-cols-5 gap-1.5">
          {RATIOS.map(r => (
            <button
              key={r.value}
              onClick={() => setAspect(r.value)}
              className={`py-2 rounded-xl border text-[10px] font-medium transition-all ${
                aspect === r.value
                  ? 'border-violet-500/50 bg-violet-500/15 text-violet-400'
                  : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'
              }`}
            >
              {r.value}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => onGenerate({ prompt, style: selected.style, aspect_ratio: aspect })}
        disabled={!prompt.trim()}
        className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 w-full"
      >
        <Sparkles size={15} /> Gerar imagem — 1 crédito
      </button>
    </div>
  )
}
