'use client'

import { useState } from 'react'
import { Sparkles, User, ChevronDown, Fingerprint, Check, Image as ImageIcon } from 'lucide-react'
import {
  StudioFieldLabel,
  StudioFormShell,
  StudioPanel,
  StudioPrimaryButton,
} from './StudioFormShell'
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
  const hasModel = !!initial.model_prompt
  const hasFace = !!initial.source_face_url

  function handlePreset(nextPreset: (typeof PRESETS)[number]) {
    setPreset(nextPreset.value)
    setOpen(false)
  }

  return (
    <StudioFormShell
      accent="violet"
      icon={<ImageIcon size={18} />}
      title="Imagem IA"
      hideHeader
      layout="split"
      chips={[
        { label: selected.label, tone: 'violet' },
        { label: aspect, tone: 'neutral' },
      ]}
      media={
        <>
          <StudioPanel title="Identidade">
            <div className="space-y-2">
              {hasModel ? (
                <div className="flex items-center gap-2 rounded-[16px] border border-indigo-500/20 bg-indigo-500/10 px-3 py-2.5 text-[10px] font-semibold text-indigo-200">
                  <User size={14} /> Modelo conectado
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-[16px] border border-white/8 bg-black/10 px-3 py-2.5 text-[10px] font-semibold text-white/46">
                  <Fingerprint size={14} /> Sem modelo
                </div>
              )}
              {hasFace ? (
                <div className="flex items-center gap-2 rounded-[16px] border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-[10px] font-semibold text-emerald-200">
                  <Check size={14} /> Rosto real
                </div>
              ) : null}
            </div>
          </StudioPanel>

          <StudioPanel title="Preset">
            <div className="rounded-[16px] border border-violet-500/14 bg-violet-500/[0.06] px-3 py-2.5">
              <p className="text-[11px] font-semibold text-white">{selected.label}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-white/44">{selected.hint}</p>
            </div>
          </StudioPanel>
        </>
      }
      controls={
        <>
          <StudioPanel title="Tipo">
            <StudioFieldLabel>Preset</StudioFieldLabel>
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex w-full items-center justify-between rounded-[16px] border border-white/8 bg-[#0B0D0F] px-3.5 py-3 text-left text-[11px] text-white transition-colors hover:border-white/14"
              >
                <span>{selected.label}</span>
                <ChevronDown size={16} className={`text-white/42 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open ? (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                  <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-[18px] border border-white/8 bg-[#101214] shadow-2xl">
                    {PRESETS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => handlePreset(item)}
                        className={`flex w-full items-start gap-3 border-b border-white/5 px-3.5 py-3 text-left transition-colors last:border-b-0 ${
                          preset === item.value ? 'bg-violet-500/10 text-violet-200' : 'text-white/64 hover:bg-white/[0.03] hover:text-white'
                        }`}
                      >
                        <div className={`mt-1 h-2 w-2 rounded-full ${preset === item.value ? 'bg-violet-300' : 'bg-white/18'}`} />
                        <div>
                          <p className="text-[10px] font-semibold">{item.label}</p>
                          <p className="mt-0.5 text-[9px] text-white/42">{item.hint}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </StudioPanel>

          <StudioPanel title="Prompt">
            <StudioFieldLabel>Direcao</StudioFieldLabel>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ex: influencer segurando o produto, luz de janela, cozinha clean ao fundo."
              rows={5}
              className="w-full resize-none rounded-[18px] border border-white/8 bg-[#0B0D0F] px-3.5 py-3 text-[12px] leading-relaxed text-white outline-none transition-colors placeholder:text-white/24 focus:border-violet-400/30"
            />
          </StudioPanel>

          <StudioPanel title="Formato">
            <div className="grid grid-cols-5 gap-2">
              {RATIOS.map((ratio) => (
                <button
                  key={ratio.value}
                  type="button"
                  onClick={() => setAspect(ratio.value)}
                  className={`rounded-[14px] border py-2.5 text-[10px] font-semibold transition-all ${
                    aspect === ratio.value
                      ? 'border-violet-400/30 bg-violet-500/12 text-white'
                      : 'border-white/8 bg-[#0B0D0F] text-white/46 hover:border-white/14 hover:text-white'
                  }`}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </StudioPanel>

          <StudioPrimaryButton
            accent="violet"
            disabled={!prompt.trim()}
            onClick={() => onGenerate({ prompt, style: selected.style, aspect_ratio: aspect })}
          >
            <Sparkles size={16} />
            Gerar imagem - {cost} CR
          </StudioPrimaryButton>
        </>
      }
    />
  )
}
