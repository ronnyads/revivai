'use client'

import { useEffect, useRef } from 'react'
import { Image, Video, Mic, ZoomIn, FileText, Captions, User, Film, Sparkles, Layers, Wand2, Upload, Scissors, MousePointer2 } from 'lucide-react'
import { AssetType } from '@/types'
import { CREDIT_COST } from '@/constants/studio'

interface CardDef {
  type: AssetType
  icon: React.ReactNode
  label: string
  desc: string
  color: string // Cor temática para o hover premium
}

const GROUPS: { label: string; items: CardDef[] }[] = [
  {
    label: 'Criação & Assets',
    items: [
      { type: 'face',    icon: <Upload size={18} />,    label: 'Rosto Real',   desc: 'Upload de face',        color: 'from-blue-500' },
      { type: 'model',   icon: <User size={18} />,      label: 'Modelo UGC',   desc: 'Persona com IA',        color: 'from-indigo-500' },
      { type: 'script',  icon: <FileText size={18} />,  label: 'Script Ad',    desc: 'Texto para vídeo',      color: 'from-amber-500' },
      { type: 'image',   icon: <Image size={18} />,     label: 'Imagem IA',    desc: 'Foto de produto',       color: 'from-emerald-500' },
      { type: 'voice',   icon: <Mic size={18} />,       label: 'Voz / Áudio',  desc: 'Locução humana',        color: 'from-rose-500' },
    ],
  },
  {
    label: 'Motores de Vídeo',
    items: [
      { type: 'video',   icon: <Video size={18} />,     label: 'Vídeo / Anima', desc: 'Kling ou Google',       color: 'from-cyan-500' },
      { type: 'animate', icon: <Sparkles size={18} />,  label: 'Movimentos',    desc: 'Replicar dança/face',   color: 'from-fuchsia-500' },
      { type: 'lipsync', icon: <Wand2 size={18} />,     label: 'Lip Sync',      desc: 'Sincronia labial',      color: 'from-sky-500' },
    ],
  },
  {
    label: 'Post-Production',
    items: [
      { type: 'compose', icon: <Layers size={18} />,    label: 'Fusão UGC',     desc: 'Modelo + Produto',      color: 'from-orange-500' },
      { type: 'upscale', icon: <ZoomIn size={18} />,    label: 'Upscale 4K',    desc: 'Restaurar fotos',       color: 'from-teal-500' },
      { type: 'caption', icon: <Captions size={18} />,  label: 'Legendas',      desc: 'Corte e legenda',       color: 'from-violet-500' },
      { type: 'render',  icon: <Film size={18} />,      label: 'Finalização',   desc: 'Merge Vídeo+Áudio',     color: 'from-pink-500' },
      { type: 'join',    icon: <Scissors size={18} />,  label: 'Unir Clipes',   desc: 'Concat via FFmpeg',     color: 'from-red-500' },
    ],
  },
]

interface Props {
  x: number
  y: number
  onAdd: (type: AssetType) => void
  onClose: () => void
}

export default function CanvasQuickAdd({ x, y, onAdd, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  // Fecha ao pressionar Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Ajusta posição para não sair da tela (Layout mais largo agora)
  const menuW = 460 
  const menuH = 520
  const left = Math.min(x, window.innerWidth  - menuW - 16)
  const top  = Math.min(y, window.innerHeight - menuH - 16)

  return (
    <>
      {/* Backdrop de foco com blur no canvas de fundo */}
      <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]" onMouseDown={onClose} />

      <div
        ref={ref}
        style={{ left, top }}
        className="fixed z-50 w-[460px] bg-zinc-950/90 backdrop-blur-xl border border-white/10 rounded-[28px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header Estilizado */}
        <div className="px-6 py-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-accent/20 rounded-xl">
              <MousePointer2 size={16} className="text-accent" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-white tracking-tight">Criação Rápida</h3>
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.15em] mt-0.5">God Mode Activated</p>
            </div>
          </div>
          <div className="px-3 py-1 bg-zinc-900 border border-white/5 rounded-full">
             <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Selecione um Card</span>
          </div>
        </div>

        <div className="p-3 overflow-y-auto max-h-[500px] custom-scrollbar">
          {GROUPS.map((group) => (
            <div key={group.label} className="mb-4 last:mb-0">
              <h4 className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-3 mb-3 flex items-center gap-2">
                <span className="w-1 h-1 bg-accent rounded-full" />
                {group.label}
              </h4>
              
              <div className="grid grid-cols-2 gap-2">
                {group.items.map(item => {
                  const cost = CREDIT_COST[item.type] ?? 0
                  return (
                    <button
                      key={item.type}
                      onMouseDown={() => { onAdd(item.type); onClose() }}
                      className="group relative flex items-start gap-4 p-4 rounded-[20px] bg-white/[0.03] border border-white/5 hover:bg-white/[0.07] hover:border-white/10 transition-all text-left overflow-hidden active:scale-[0.97]"
                    >
                      {/* Glow de fundo no hover */}
                      <div className={`absolute -right-4 -bottom-4 w-12 h-12 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity`} />
                      
                      {/* Ícone Container */}
                      <div className={`shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br ${item.color} to-transparent p-[1px] opacity-80 group-hover:opacity-100 transition-all shadow-lg`}>
                        <div className="w-full h-full bg-zinc-950 rounded-[15px] flex items-center justify-center text-white">
                          {item.icon}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 py-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-bold text-zinc-100 leading-none truncate group-hover:text-white transition-colors">
                            {item.label}
                          </p>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${cost === 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-zinc-500'}`}>
                            {cost === 0 ? 'FREE' : `${cost}cr`}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 leading-tight mt-1.5 line-clamp-2">
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

        {/* Footer info */}
        <div className="px-6 py-3 bg-accent/5 border-t border-accent/10 flex items-center justify-center gap-2">
           <Sparkles size={12} className="text-accent/60" />
           <p className="text-[10px] font-medium text-accent/60 tracking-wide uppercase">Cresça seu negócio com o poder da IA</p>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </>
  )
}
