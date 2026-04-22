'use client'

import { useState } from 'react'
import { Sparkles, User, ChevronDown, Fingerprint, Check, Image as ImageIcon } from 'lucide-react'
import { CREDIT_COST } from '@/constants/studio'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

const PRESETS = [
  { value: 'influencer_realista', label: 'Influencer Realista', style: 'realista', hint: 'Cenas naturais, luz limpa e retrato premium.' },
  { value: 'influencer_ugc', label: 'Influencer UGC', style: 'ugc', hint: 'Criadora de conteudo com linguagem casual e autentica.' },
  { value: 'clone', label: 'Clonar Rosto do Modelo', style: 'clonado', hint: 'Mantem a mesma persona ao conectar um Modelo UGC.' },
  { value: 'produto_realista', label: 'Produto Realista', style: 'produto', hint: 'Foto comercial premium com foco total no produto.' },
  { value: 'logo', label: 'Logo Profissional', style: 'logo', hint: 'Marca minimalista com alto refinamento visual.' },
  { value: 'aleatoria', label: 'Imagem Aleatoria', style: 'aleatoria', hint: 'Geracao livre para explorar referencias visuais.' },
  { value: 'mascote', label: 'Mascote / Avatar 3D', style: 'mascote', hint: 'Personagem 3D com identidade forte e volume.' },
  { value: 'personagem_cartoon', label: 'Personagem 2D', style: 'cartoon', hint: 'Cartoon estilizado com leitura imediata.' },
]

const RATIOS = [
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
]

export default function ImageGenerator({ initial, onGenerate }: Props) {
  const [preset, setPreset] = useState('influencer_realista')
  const [prompt, setPrompt] = useState(String(initial.prompt ?? ''))
  const [aspect, setAspect] = useState(String(initial.aspect_ratio ?? '9:16'))
  const [open, setOpen] = useState(false)

  const selected = PRESETS.find((item) => item.value === preset) ?? PRESETS[0]
  const cost = CREDIT_COST.image

  function handlePreset(nextPreset: (typeof PRESETS)[number]) {
    setPreset(nextPreset.value)
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <div className="rounded-xl bg-violet-500/10 p-2">
          <Sparkles size={16} className="text-violet-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-[12px] font-bold leading-tight text-white">Diretor de Cena & Fotografia</h4>
          <p className="text-[10px] leading-tight text-zinc-400">Defina estilo, acao, contexto e proporcao da imagem em um fluxo mais rapido.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-violet-300">
              <ImageIcon size={12} /> Contexto
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-300">
              Aqui voce escolhe o tipo de imagem e descreve a cena. O board fica mais compacto, mas o controle continua completo.
            </p>
          </div>

          <div className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
            <label className="block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Conexoes</label>
            {!!initial.model_prompt ? (
              <div className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                <User size={12} strokeWidth={3} /> Modelo conectado
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-zinc-700/50 bg-zinc-800/50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                <Fingerprint size={12} /> Sem modelo conectado
              </div>
            )}
            {!!initial.source_face_url ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                <Check size={12} strokeWidth={3} /> Rosto real ativo
              </div>
            ) : null}
          </div>

          <div className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
            <label className="block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Preset</label>
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-3 py-3">
              <p className="text-[11px] font-bold text-white">{selected.label}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">{selected.hint}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <label className="block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">O que voce quer gerar?</label>
            <div className="relative">
              <button
                onClick={() => setOpen((value) => !value)}
                className="flex w-full items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-all hover:border-zinc-500 focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
                  {selected.label}
                </span>
                <ChevronDown size={16} className={`text-zinc-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
              </button>
              {open ? (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                    {PRESETS.map((item) => (
                      <button
                        key={item.value}
                        onClick={() => handlePreset(item)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-zinc-800 ${
                          preset === item.value ? 'bg-violet-500/10 font-bold text-violet-400' : 'text-zinc-400'
                        }`}
                      >
                        <div className={`h-1.5 w-1.5 rounded-full ${preset === item.value ? 'bg-violet-400' : 'bg-transparent'}`} />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Descricao da cena & acao</label>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ex: influencer segurando o produto, luz entrando pela janela, cozinha minimalista ao fundo, expressao de surpresa..."
              rows={6}
              className="w-full resize-none rounded-2xl border border-zinc-700/60 bg-zinc-900/80 px-4 py-3.5 text-[13px] leading-relaxed text-white placeholder-zinc-700 shadow-inner transition-all focus:border-violet-500/50 focus:outline-none"
            />
            <p className="px-1 text-[9px] italic leading-relaxed text-zinc-600">
              Descreva acao, ambiente, luz e enquadramento. Quanto mais clara a direcao, melhor a imagem.
            </p>
          </div>

          <div className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
            <label className="block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Proporcao</label>
            <div className="grid grid-cols-5 gap-1.5">
              {RATIOS.map((ratio) => (
                <button
                  key={ratio.value}
                  onClick={() => setAspect(ratio.value)}
                  className={`rounded-xl border py-2 text-[10px] font-medium transition-all ${
                    aspect === ratio.value
                      ? 'border-violet-500/50 bg-violet-500/15 text-violet-400'
                      : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'
                  }`}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onGenerate({ prompt, style: selected.style, aspect_ratio: aspect })}
            disabled={!prompt.trim()}
            className="group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-violet-600 py-4 text-xs font-bold text-white transition-all hover:bg-violet-500 active:scale-95 disabled:opacity-40"
          >
            <Sparkles size={14} />
            GERAR IMAGEM - {cost} CREDITOS
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover/btn:animate-shimmer" />
          </button>
        </div>
      </div>
    </div>
  )
}
