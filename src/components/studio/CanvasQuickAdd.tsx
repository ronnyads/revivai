'use client'

import { useEffect, useRef } from 'react'
import {
  Camera,
  Captions,
  ChevronDown,
  FileText,
  Film,
  Image as ImageIcon,
  Layers,
  Mic,
  Music,
  Plus,
  Scissors,
  Sparkles,
  Upload,
  User,
  Video,
  Wand2,
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
    label: 'Foto e Imagem',
    items: [
      { type: 'face', icon: <Upload size={20} />, label: 'Rosto Real', desc: 'Injetar face real', gradient: 'from-emerald-400 to-emerald-600' },
      { type: 'model', icon: <User size={20} />, label: 'Modelo UGC', desc: 'Persona em estudio branco', gradient: 'from-sky-500 to-cyan-500' },
      { type: 'image', icon: <ImageIcon size={20} />, label: 'Imagem IA', desc: 'Foto de produto / cena', gradient: 'from-cyan-400 to-blue-500' },
      { type: 'ugc_bundle', icon: <Sparkles size={20} />, label: 'Pacote 8 UGC', desc: '8 poses automaticas', gradient: 'from-cyan-400 to-teal-500' },
      { type: 'scene', icon: <Camera size={20} />, label: 'Cena Livre', desc: 'Modelo em qualquer lugar', gradient: 'from-blue-500 to-indigo-500' },
      { type: 'angles', icon: <Camera size={20} />, label: 'Dir. de Cena', desc: 'Trocar angulo / perspectiva', gradient: 'from-teal-400 to-emerald-600' },
      { type: 'compose', icon: <Layers size={20} />, label: 'Provador', desc: 'Look, roupa e visual com produto', gradient: 'from-amber-400 to-yellow-500', presetParams: { compose_variant: 'fitting' } },
      { type: 'compose', icon: <Layers size={20} />, label: 'Produto + Modelo', desc: 'Cena comercial com produto em destaque', gradient: 'from-orange-500 to-amber-500', presetParams: { compose_variant: 'product' } },
      { type: 'upscale', icon: <ZoomIn size={20} />, label: 'Upscale 4K', desc: 'Nitidez extrema', gradient: 'from-emerald-400 to-cyan-500' },
    ],
  },
  {
    label: 'Video e Movimento',
    items: [
      { type: 'video', icon: <Video size={20} />, label: 'Video / Anima', desc: 'Veo 3.1 / Kling AI', gradient: 'from-zinc-600 to-zinc-800' },
      { type: 'animate', icon: <Sparkles size={20} />, label: 'Movimentos', desc: 'Replicar trejeitos', gradient: 'from-fuchsia-500 to-rose-500' },
      { type: 'lipsync', icon: <Wand2 size={20} />, label: 'Lip Sync', desc: 'Sincronia labial real', gradient: 'from-cyan-400 to-sky-500' },
      { type: 'render', icon: <Film size={20} />, label: 'Video Final', desc: 'Mix render master', gradient: 'from-zinc-300 to-zinc-500' },
      { type: 'join', icon: <Scissors size={20} />, label: 'Unir Clipes', desc: 'Costura FFmpeg', gradient: 'from-red-400 to-red-500' },
    ],
  },
  {
    label: 'Audio e Texto',
    items: [
      { type: 'script', icon: <FileText size={20} />, label: 'Script Ad', desc: 'Copy para vendas', gradient: 'from-amber-400 to-orange-500' },
      { type: 'voice', icon: <Mic size={20} />, label: 'Voz / Locucao', desc: 'Locucao humana realista', gradient: 'from-rose-400 to-red-500' },
      { type: 'music', icon: <Music size={20} />, label: 'Trilha Sonora AI', desc: 'Compor trilha exclusiva', gradient: 'from-sky-500 to-indigo-500' },
      { type: 'caption', icon: <Captions size={20} />, label: 'Legendas', desc: 'Dinamicas e coloridas', gradient: 'from-violet-500 to-indigo-500' },
    ],
  },
]

interface Props {
  x: number
  y: number
  onAdd: (type: AssetType, presetParams?: Record<string, unknown>) => void
  onClose: () => void
}

export default function CanvasQuickAdd({ x, y, onAdd, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const menuW = 460
  const menuH = 520
  const left = Math.min(x, window.innerWidth - menuW - 16)
  const top = Math.min(y, window.innerHeight - menuH - 16)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onMouseDown={onClose} />

      <div
        ref={ref}
        style={{ left, top }}
        className="fixed z-50 flex h-[520px] w-[460px] flex-col overflow-hidden rounded-[36px] border border-white/10 bg-[#0F1011] shadow-[0_30px_100px_rgba(0,0,0,0.85)] animate-in fade-in zoom-in-95 duration-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/5 bg-[linear-gradient(180deg,rgba(84,214,246,0.08),rgba(255,255,255,0.02))] px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="rounded-[18px] border border-[#54D6F6]/20 bg-[#0C171A] p-3 shadow-[0_0_0_10px_rgba(84,214,246,0.08)]">
              <Plus size={20} className="text-[#54D6F6]" />
            </div>
            <div>
              <h3 className="text-[18px] font-semibold tracking-tight text-white">O que vamos criar?</h3>
              <p className="mt-1 font-label text-[10px] uppercase tracking-[0.28em] text-[#54D6F6]">quick insert</p>
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
                      onMouseDown={() => { onAdd(item.type, item.presetParams); onClose() }}
                      className="group relative flex items-center gap-4 overflow-hidden rounded-[28px] border border-white/5 bg-white/[0.03] p-4 text-left transition-all hover:border-[#54D6F6]/35 hover:bg-white/[0.08] active:scale-[0.97]"
                    >
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br ${item.gradient} text-white shadow-xl`}>
                        {item.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[14px] font-semibold leading-none tracking-tight text-white">
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

        <div className="flex shrink-0 items-center justify-between border-t border-white/5 bg-black/30 px-10 py-5">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-[#54D6F6] shadow-[0_0_18px_rgba(84,214,246,0.7)]" />
            <p className="font-label text-[11px] uppercase tracking-[0.28em] text-[#A8B5B8]">revivai studio</p>
          </div>
          <ChevronDown size={16} className="animate-bounce text-[#54D6F6]" />
        </div>
      </div>

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
        .custom-scrollbar-cyan::-webkit-scrollbar-thumb:hover {
          background: #54d6f6;
        }
      `}</style>
    </>
  )
}
