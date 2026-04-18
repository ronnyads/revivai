'use client'

import { useState } from 'react'
import { Sparkles, User, ChevronDown, Fingerprint, Check } from 'lucide-react'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

const PRESETS = [
  {
    value: 'influencer_realista',
    label: 'Influencer Realista',
    style: 'realista',
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
    style: 'clonado',
    hint: 'Conecte um card Modelo UGC para manter a mesma persona na cena',
  },
  {
    value: 'produto_realista',
    label: 'Produto Realista',
    style: 'produto',
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
    style: 'aleatoria',
    hint: 'Ex: cena lifestyle, luz natural, composição equilibrada, cores vibrantes...',
  },
  {
    value: 'mascote',
    label: 'Mascote / Avatar 3D (Clone)',
    style: 'mascote',
    hint: 'Ex: O golfinho bebendo café, cena 3d, iluminação de cinema...',
  },
  {
    value: 'personagem_cartoon',
    label: 'Personagem 2D (Cartoon)',
    style: 'cartoon',
    hint: 'Ex: Personagem estilo Cartoon Network de fone de ouvido colorido e traços fortes...',
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
  const cost = CREDIT_COST['image']

  function handlePreset(p: typeof PRESETS[0]) {
    setPreset(p.value)
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho de Explicação */}
      <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-violet-500/20 rounded-xl mt-0.5">
          <Sparkles size={18} className="text-violet-400" />
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-white leading-tight">Diretor de Cena & Fotografia</h4>
          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
            Aqui você define o <b>cenário, a luz e a ação</b>. Descreva o que está acontecendo na foto e onde ela se passa.
          </p>
        </div>
      </div>

      {/* Indicadores de conexão */}
      <div className="flex flex-wrap gap-2">
        {!!initial.model_prompt ? (
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-3 py-2 rounded-xl">
            <User size={12} strokeWidth={3} /> Modelo Conectado
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-800/50 border border-zinc-700/50 px-3 py-2 rounded-xl">
            <Fingerprint size={12} /> Sem Modelo Conectado
          </div>
        )}
        {!!initial.source_face_url && (
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-xl">
            <Check size={12} strokeWidth={3} /> Rosto Real Ativo
          </div>
        )}
      </div>

      {/* Preset selector */}
      <div className="space-y-2">
        <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1">O que você quer gerar?</label>
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none hover:border-zinc-500 transition-all font-medium"
          >
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
              {selected.label}
            </span>
            <ChevronDown size={16} className={`text-zinc-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute left-0 right-0 top-full mt-2 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {PRESETS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => handlePreset(p)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors hover:bg-zinc-800 ${
                      preset === p.value ? 'text-violet-400 bg-violet-500/10 font-bold' : 'text-zinc-400'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${preset === p.value ? 'bg-violet-400' : 'bg-transparent'}`} />
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Descrição da Cena & Ação</label>
        </div>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Diga à IA o que fazer: 'Influencer segurando o produto e sorrindo', 'No meio de uma sala de estar moderna', 'Luz solar entrando pela janela', 'Cena de unboxing com as mãos em destaque', 'Fundo de escritório desfocado'..."
          rows={6}
          className="w-full bg-zinc-900/80 border border-zinc-700/60 rounded-2xl px-4 py-3.5 text-[13px] text-white placeholder-zinc-700 resize-none focus:outline-none focus:border-violet-500/50 transition-all leading-relaxed shadow-inner"
        />
        <p className="text-[9px] text-zinc-600 italic leading-relaxed px-1">
          💡 <b>Dica:</b> Descreva o que a modelo está fazendo e como é o lugar. Ex: "Tomando café em uma varanda com sol".
        </p>
      </div>

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
