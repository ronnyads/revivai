'use client'

import { useState } from 'react'
import {
  Camera,
  Captions,
  ChevronDown,
  FileText,
  Film,
  Image as ImageIcon,
  Layers,
  Mic,
  MousePointer2,
  Plus,
  Scissors,
  Sparkles,
  Upload,
  User,
  Video,
  Wand2,
  X,
  ZoomIn,
} from 'lucide-react'
import { AssetType } from '@/types'
import { CREDIT_COST } from '@/constants/studio'

interface CardDef {
  type: AssetType
  icon: React.ReactNode
  label: string
  desc: string
  gradient: string
  presetParams?: Record<string, unknown>
}

const GROUPS: { label: string; items: CardDef[] }[] = [
  {
    label: 'Criação',
    items: [
      { type: 'face', icon: <Upload size={20} />, label: 'Rosto Real', desc: 'Injetar face real', gradient: 'from-emerald-400 to-emerald-600' },
      { type: 'model', icon: <User size={20} />, label: 'Modelo UGC', desc: 'Persona realista', gradient: 'from-sky-500 to-cyan-500' },
      { type: 'script', icon: <FileText size={20} />, label: 'Script', desc: 'Copy para vendas', gradient: 'from-amber-400 to-orange-500' },
      { type: 'image', icon: <ImageIcon size={20} />, label: 'Imagem IA', desc: 'Foto de produto', gradient: 'from-cyan-400 to-blue-500' },
      { type: 'voice', icon: <Mic size={20} />, label: 'Voz', desc: 'Voz humana sintética', gradient: 'from-rose-400 to-red-500' },
      { type: 'angles', icon: <Camera size={20} />, label: 'Dir. de Cena', desc: 'Varia câmera e pose', gradient: 'from-teal-400 to-emerald-600' },
      { type: 'ugc_bundle', icon: <Sparkles size={20} />, label: 'Pacote 8 UGC', desc: '8 poses UGC de uma vez', gradient: 'from-cyan-400 to-teal-500' },
      { type: 'scene', icon: <Camera size={20} />, label: 'Cena Livre', desc: 'Modelo em qualquer lugar', gradient: 'from-blue-500 to-indigo-500' },
      { type: 'look_split', icon: <Scissors size={20} />, label: 'Separar Look', desc: 'Segmenta look em partes', gradient: 'from-teal-400 to-cyan-500' },
    ],
  },
  {
    label: 'Movimento e Vídeo',
    items: [
      { type: 'video', icon: <Video size={20} />, label: 'Vídeo', desc: 'Anima imagem com IA', gradient: 'from-zinc-600 to-zinc-800' },
      { type: 'talking_video', icon: <Mic size={20} />, label: 'Vídeo com Fala', desc: 'Avatar falante com Veo', gradient: 'from-blue-500 to-cyan-500' },
      { type: 'animate', icon: <Sparkles size={20} />, label: 'Movimento Guiado', desc: 'Imita movimento de referência', gradient: 'from-fuchsia-500 to-rose-500' },
      { type: 'lipsync', icon: <Wand2 size={20} />, label: 'Lip Sync', desc: 'Sincroniza fala no vídeo', gradient: 'from-cyan-400 to-sky-500' },
      { type: 'voice_convert', icon: <Mic size={20} />, label: 'Converter Voz', desc: 'Muda o gênero ou timbre da voz', gradient: 'from-violet-500 to-purple-600' },
    ],
  },
  {
    label: 'Entrega',
    items: [
      { type: 'compose', icon: <Layers size={20} />, label: 'Provador', desc: 'Veste a peça no modelo', gradient: 'from-amber-400 to-yellow-500', presetParams: { compose_variant: 'fitting' } },
      { type: 'compose', icon: <Layers size={20} />, label: 'Modelo + Produto', desc: 'Modelo segurando o produto', gradient: 'from-orange-500 to-amber-500', presetParams: { compose_variant: 'product' } },
      { type: 'upscale', icon: <ZoomIn size={20} />, label: 'Upscale 4K', desc: 'Nitidez extrema', gradient: 'from-emerald-400 to-cyan-500' },
      { type: 'caption', icon: <Captions size={20} />, label: 'Legendas', desc: 'Gera legendas do áudio', gradient: 'from-violet-500 to-indigo-500' },
      { type: 'render', icon: <Film size={20} />, label: 'Vídeo Final', desc: 'Une vídeo e áudio', gradient: 'from-zinc-300 to-zinc-500' },
      { type: 'join', icon: <Scissors size={20} />, label: 'Unir Clipes', desc: 'Junta clipes em sequência', gradient: 'from-red-400 to-red-500' },
    ],
  },
]

interface Props {
  onAdd: (type: AssetType, presetParams?: Record<string, unknown>) => void
  disabled?: boolean
}

export default function AddCardMenu({ onAdd, disabled }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        disabled={disabled}
        className={`flex items-center gap-2 rounded-2xl px-6 py-3 font-label text-[11px] uppercase tracking-[0.28em] transition-all disabled:opacity-50 ${
          open
            ? 'border border-white/10 bg-[#121212] text-white'
            : 'bg-cyan-gradient text-[#003641] shadow-[0_20px_40px_rgba(84,214,246,0.18)] hover:brightness-110'
        }`}
      >
        {open ? <X size={16} /> : <Plus size={18} />}
        adicionar card
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full z-50 mt-4 flex h-[540px] w-[480px] origin-top-right flex-col overflow-hidden rounded-[36px] border border-white/10 bg-[#0F1011] shadow-[0_40px_100px_rgba(0,0,0,0.85)] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex shrink-0 items-center justify-between border-b border-white/5 bg-[linear-gradient(180deg,rgba(84,214,246,0.08),rgba(255,255,255,0.02))] px-8 py-6">
              <div className="flex items-center gap-4">
                <div className="rounded-[18px] border border-[#54D6F6]/20 bg-[#0C171A] p-3 shadow-[0_0_0_10px_rgba(84,214,246,0.08)]">
                  <MousePointer2 size={20} className="text-[#54D6F6]" />
                </div>
                <div>
                  <h3 className="text-[19px] font-semibold tracking-tight text-white">Equipamentos IA</h3>
                  <p className="mt-1 font-label text-[10px] uppercase tracking-[0.28em] text-[#54D6F6]">workspace modules</p>
                </div>
              </div>
            </div>

            <div className="custom-scrollbar-cyan flex-1 space-y-8 overflow-y-auto px-6 py-4">
              {GROUPS.map((group) => (
                <div key={group.label}>
                  <h4 className="mb-5 flex items-center gap-3 font-label text-[11px] uppercase tracking-[0.24em] text-[#54D6F6]">
                    <div className="h-px w-6 bg-[#54D6F6]/35" />
                    {group.label}
                    <div className="h-px flex-1 bg-[#54D6F6]/12" />
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    {group.items.map((item) => {
                      const cost = CREDIT_COST[item.type] ?? 0

                      return (
                        <button
                          key={`${item.type}-${item.label}`}
                          onClick={() => { onAdd(item.type, item.presetParams); setOpen(false) }}
                          className="group relative flex items-center gap-4 overflow-hidden rounded-[28px] border border-white/5 bg-white/[0.03] p-4 text-left transition-all hover:border-[#54D6F6]/35 hover:bg-white/[0.08] active:scale-[0.97]"
                        >
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[17px] bg-gradient-to-br ${item.gradient} text-white shadow-xl`}>
                            {item.icon}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[13px] font-semibold leading-none text-white transition-colors group-hover:text-[#DFF9FF]">
                                {item.label}
                              </p>
                              <span className={`rounded-full px-2 py-1 font-label text-[9px] uppercase tracking-[0.18em] ${
                                cost === 0
                                  ? 'bg-emerald-500 text-white'
                                  : 'border border-[#54D6F6]/20 bg-[#0C171A] text-[#54D6F6]'
                              }`}>
                                {cost === 0 ? 'free' : `${cost}cr`}
                              </span>
                            </div>

                            <p className="mt-2 line-clamp-1 text-[11px] leading-tight text-[#7D8B90] transition-colors group-hover:text-[#B9CBD0]">
                              {item.desc}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex shrink-0 items-center justify-center gap-3 border-t border-white/5 bg-black/30 px-10 py-5">
              <Sparkles size={14} className="animate-pulse text-[#54D6F6]" />
              <p className="font-label text-[11px] uppercase tracking-[0.28em] text-white">experiencia unificada</p>
              <ChevronDown size={16} className="animate-bounce text-[#54D6F6]" />
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .custom-scrollbar-cyan::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar-cyan::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 20px;
          margin: 15px;
        }
        .custom-scrollbar-cyan::-webkit-scrollbar-thumb {
          background: #00adcc;
          border-radius: 20px;
          border: 2px solid #0f1011;
        }
      `}</style>
    </div>
  )
}
