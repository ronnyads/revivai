'use client'

import { useEffect, useRef } from 'react'
import { Image, Video, Mic, ZoomIn, FileText, Captions, User, Film, Sparkles, Layers, Wand2, Upload, Scissors, MousePointer2, ChevronDown, Plus, Camera, Music } from 'lucide-react'
import { AssetType } from '@/types'
import { CREDIT_COST } from '@/constants/studio'

interface CardDef {
  type: AssetType
  icon: React.ReactNode
  label: string
  desc: string
  gradient: string 
}

const GROUPS: { label: string; items: CardDef[] }[] = [
  {
    label: 'Criação & IA Studio',
    items: [
      { type: 'face',    icon: <Upload size={20} />,    label: 'Rosto Real',   desc: 'Injetar face real',     gradient: 'from-[#34C759] to-[#30B753]' }, 
      { type: 'model',   icon: <User size={20} />,      label: 'Modelo UGC',   desc: 'Persona realista',      gradient: 'from-[#5856D6] to-[#AF52DE]' }, 
      { type: 'script',  icon: <FileText size={20} />,  label: 'Script Ad',    desc: 'Copy para vendas',      gradient: 'from-[#FF9500] to-[#FFCC00]' }, 
      { type: 'image',   icon: <Image size={20} />,     label: 'Imagem IA',    desc: 'Foto de produto',       gradient: 'from-[#007AFF] to-[#00C7BE]' }, 
      { type: 'voice',   icon: <Mic size={20} />,       label: 'Voz / Audio',  desc: 'Locução humana',        gradient: 'from-[#FF2D55] to-[#FF3B30]' }, 
      { type: 'music',   icon: <Music size={20} />,     label: 'Trilha Sonora AI', desc: 'Compor trilha exclusiva', gradient: 'from-[#007AFF] to-[#5856D6]' },
      { type: 'angles',  icon: <Camera size={20} />,    label: 'Dir. de Cena', desc: 'Trocar perspectiva',    gradient: 'from-[#34D399] to-[#059669]' },
    ],
  },
  {
    label: 'Motores de Movimento',
    items: [
      { type: 'video',   icon: <Video size={20} />,     label: 'Vídeo / Anima', desc: 'Veo 3.1 / Kling AI',    gradient: 'from-[#141414] to-[#444444]' },
      { type: 'animate', icon: <Sparkles size={20} />,  label: 'Movimentos',    desc: 'Replicar trejeitos',    gradient: 'from-[#FF375F] to-[#BF5AF2]' }, 
      { type: 'lipsync', icon: <Wand2 size={20} />,     label: 'Lip Sync',      desc: 'Sincronia real',        gradient: 'from-[#64D2FF] to-[#0A84FF]' }, 
    ],
  },
  {
    label: 'Estúdio de Entrega',
    items: [
      { type: 'compose', icon: <Layers size={20} />,    label: 'Fusão UGC',     desc: 'Unir Ator+Produto',     gradient: 'from-[#FF9F0A] to-[#FFD60A]' }, 
      { type: 'upscale', icon: <ZoomIn size={20} />,    label: 'Upscale 4K',    desc: 'Nitidez extrema',       gradient: 'from-[#30D158] to-[#66D4CF]' }, 
      { type: 'caption', icon: <Captions size={20} />,  label: 'Legendas',      desc: 'Dinâmicas e cores',     gradient: 'from-[#BF5AF2] to-[#5E5CE6]' }, 
      { type: 'render',  icon: <Film size={20} />,      label: 'Vídeo Final',   desc: 'Mix Render Master',     gradient: 'from-[#8E8E93] to-[#C7C7CC]' }, 
      { type: 'join',    icon: <Scissors size={20} />,  label: 'Unir Clipes',   desc: 'Costura FFmpeg',        gradient: 'from-[#FF453A] to-[#FF3B30]' }, 
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const menuW = 460 
  const menuH = 520
  const left = Math.min(x, window.innerWidth  - menuW - 16)
  const top  = Math.min(y, window.innerHeight - menuH - 16)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onMouseDown={onClose} />

      <div
        ref={ref}
        style={{ left, top }}
        className="fixed z-50 w-[460px] h-[520px] bg-[#0c0c0e] border border-white/10 rounded-[40px] shadow-[0_30px_100px_rgba(0,0,0,1)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent rounded-[20px] shadow-[0_0_25px_rgba(124,58,237,0.4)]">
              <Plus size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-[18px] font-black text-white tracking-tight">O que vamos criar?</h3>
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.25em] mt-0.5 leading-none">God Mode Activated</p>
            </div>
          </div>
        </div>

        {/* Content - Estrutura Simplificada e Robusta */}
        <div className="flex-1 overflow-y-auto custom-scrollbar-vibrant px-6 py-4 space-y-8">
            {GROUPS.map((group) => (
              <div key={group.label}>
                <h4 className="text-[11px] text-accent font-black uppercase tracking-[0.2em] mb-5 flex items-center gap-3">
                   <div className="h-px w-6 bg-accent/30" />
                   {group.label}
                   <div className="h-px flex-1 bg-accent/10" />
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  {group.items.map(item => {
                    const cost = CREDIT_COST[item.type] ?? 0
                    return (
                      <button
                        key={item.type}
                        onMouseDown={() => { onAdd(item.type); onClose() }}
                        className="group relative flex items-center gap-4 p-4 rounded-[30px] bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-accent/40 transition-colors text-left active:scale-[0.94] overflow-hidden"
                      >
                        <div className={`shrink-0 w-12 h-12 rounded-[18px] bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-xl`}>
                          <div className="text-white drop-shadow-lg scale-110">
                             {item.icon}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 z-10">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[14px] font-black text-white leading-none tracking-tight">
                              {item.label}
                            </p>
                            <span className={`text-[9px] font-black px-2 py-1 rounded-full shadow-lg ${
                              cost === 0 
                              ? 'bg-emerald-500 text-white animate-pulse' 
                              : 'bg-accent text-white border border-white/20'
                            }`}>
                              {cost === 0 ? 'FREE' : `${cost}cr`}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 leading-tight mt-2 line-clamp-1 group-hover:text-zinc-300 transition-colors">
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

        {/* Footer */}
        <div className="px-10 py-5 bg-black/40 border-t border-white/5 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-3">
             <div className="w-3 h-3 bg-accent rounded-full animate-pulse shadow-[0_0_15px_rgba(124,58,237,0.6)]" />
             <p className="text-[11px] font-black text-zinc-400 tracking-widest uppercase">RevivAI Studio © 2026</p>
           </div>
           <ChevronDown size={16} className="text-accent animate-bounce" />
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar-vibrant::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar-vibrant::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
          border-radius: 20px;
          margin: 15px;
        }
        .custom-scrollbar-vibrant::-webkit-scrollbar-thumb {
          background: #7c3aed;
          border-radius: 20px;
          border: 2px solid #0c0c0e;
        }
        .custom-scrollbar-vibrant::-webkit-scrollbar-thumb:hover {
          background: #a78bfa;
        }
      `}</style>
    </>
  )
}
