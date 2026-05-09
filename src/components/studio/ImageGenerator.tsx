'use client'

import { useState } from 'react'
import { Sparkles, User, Fingerprint, Check, ChevronDown, Loader2 } from 'lucide-react'
import { CREDIT_COST } from '@/constants/studio'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

const PRESETS = [
  { value: 'influencer_realista', label: 'Influencer Realista',  style: 'realista', hint: 'Cenas naturais, luz limpa e retrato premium.' },
  { value: 'influencer_ugc',      label: 'Influencer UGC',       style: 'ugc',      hint: 'Criadora de conteudo com linguagem casual e autentica.' },
  { value: 'clone',               label: 'Clonar Rosto do Modelo', style: 'clonado', hint: 'Mantem a mesma persona ao conectar um Modelo UGC.' },
  { value: 'produto_realista',    label: 'Produto Realista',     style: 'produto',  hint: 'Foto comercial premium com foco total no produto.' },
  { value: 'logo',                label: 'Logo Profissional',    style: 'logo',     hint: 'Marca minimalista com alto refinamento visual.' },
  { value: 'aleatoria',           label: 'Imagem Aleatoria',     style: 'aleatoria', hint: 'Geracao livre para explorar referencias visuais.' },
  { value: 'mascote',             label: 'Mascote / Avatar 3D',  style: 'mascote',  hint: 'Personagem 3D com identidade forte e volume.' },
  { value: 'personagem_cartoon',  label: 'Personagem 2D',        style: 'cartoon',  hint: 'Cartoon estilizado com leitura imediata.' },
]

const RATIOS = ['9:16', '1:1', '16:9', '4:3', '3:4']

function Select({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-[10px] border border-white/10 bg-[#0B0D0F] px-3 py-2 pr-8 text-[11px] text-white/88 outline-none transition-colors focus:border-white/20"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30" />
    </div>
  )
}

export default function ImageGenerator({ initial, onGenerate }: Props) {
  const [preset,  setPreset]  = useState(String(initial.style ?? 'influencer_realista'))
  const [prompt,  setPrompt]  = useState(String(initial.prompt ?? ''))
  const [aspect,  setAspect]  = useState(String(initial.aspect_ratio ?? '9:16'))
  const [loading, setLoading] = useState(false)

  const selected   = PRESETS.find((p) => p.value === preset) ?? PRESETS[0]
  const cost       = CREDIT_COST.image ?? 8
  const hasModel   = !!initial.model_prompt
  const hasFace    = !!initial.source_face_url
  const canGenerate = !loading && prompt.trim().length > 0

  return (
    <div className="space-y-3 pt-1">

      {/* Identidade */}
      {(hasModel || hasFace) && (
        <div className="flex flex-col gap-1.5">
          {hasModel && (
            <div className="flex items-center gap-2 rounded-[10px] border border-indigo-500/20 bg-indigo-500/8 px-3 py-2 text-[10px] font-medium text-indigo-200">
              <User size={12} /> Modelo conectado
            </div>
          )}
          {hasFace && (
            <div className="flex items-center gap-2 rounded-[10px] border border-emerald-500/20 bg-emerald-500/8 px-3 py-2 text-[10px] font-medium text-emerald-200">
              <Check size={12} /> Rosto real conectado
            </div>
          )}
        </div>
      )}
      {!hasModel && !hasFace && (
        <div className="flex items-center gap-2 rounded-[10px] border border-white/8 bg-white/[0.03] px-3 py-2 text-[10px] font-medium text-white/36">
          <Fingerprint size={12} /> Sem modelo conectado
        </div>
      )}

      {/* Preset */}
      <div>
        <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/36">Preset</p>
        <Select
          value={selected.value}
          onChange={setPreset}
          options={PRESETS.map((p) => ({ value: p.value, label: p.label }))}
        />
        <p className="mt-1.5 text-[10px] leading-relaxed text-white/40">{selected.hint}</p>
      </div>

      {/* Prompt */}
      <div>
        <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/36">Direcao</p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="Ex: influencer segurando o produto, luz de janela, cozinha clean ao fundo."
          className="w-full resize-none rounded-[12px] border border-white/8 bg-[#0B0D0F] px-3 py-2.5 text-[11px] leading-relaxed text-white outline-none placeholder:text-white/22 focus:border-violet-400/28 transition-colors"
        />
      </div>

      {/* Formato */}
      <div>
        <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/36">Formato</p>
        <div className="flex gap-1.5">
          {RATIOS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setAspect(r)}
              className={`flex-1 rounded-[9px] border py-2 text-[10px] font-semibold transition-colors ${
                aspect === r
                  ? 'border-violet-400/30 bg-violet-500/12 text-white'
                  : 'border-white/8 bg-white/[0.04] text-white/40 hover:text-white/60'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Meta */}
      <div className="flex justify-end">
        <span className="text-[9px] text-white/40">
          {aspect} · <span className="font-semibold text-white/60">{cost} CR</span>
        </span>
      </div>

      {/* Gerar */}
      <button
        type="button"
        disabled={!canGenerate}
        onClick={() => {
          setLoading(true)
          onGenerate({ prompt, style: selected.style, aspect_ratio: aspect })
        }}
        className="flex w-full items-center justify-center gap-2 rounded-[13px] bg-violet-600 py-3 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-35"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {loading ? 'Gerando...' : `Gerar imagem — ${cost} CR`}
      </button>
    </div>
  )
}
