'use client'

import { useEffect, useRef } from 'react'
import { Image, Video, Mic, ZoomIn, FileText, Captions, User, Film, Sparkles, Layers, Wand2, Upload, Scissors, MousePointer2, ChevronDown } from 'lucide-react'
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
    ],
  },
  {
    label: 'Motores de Movimento',
    items: [
      { type: 'video',   icon: <Video size={20} />,     label: 'Vídeo / Anima', desc: 'Sora / Kling AI',       gradient: 'from-[#141414] to-[#444444]' }, 
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
  const menuH = 500
  const left = Math.min(x, window.innerWidth  - menuW - 16)
  const top  = Math.min(y, window.innerHeight - menuH - 16)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[4px]" onMouseDown={onClose} />

      <div
        ref={ref}
        style={{ left, top }}
        className="fixed z-50 w-[460px] bg-[#0c0c0e] border border-white/10 rounded-[32px] shadow-[0_30px_90px_-12px_rgba(0,0,0,1)] overflow-hidden animate-in zoom-in-95 fade-in duration-300 origin-top-left flex flex-col h-[520px]"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 py-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-accent rounded-2xl shadow-[0_0_20px_rgba(124,58,237,0.3)]">
              <Plus size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-[17px] font-black text-white tracking-tight">Criação Studio</h3>
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] mt-0.5">God Mode Activated</p>
            </div>
          </div>
        </div>

        {/* Content con Scroll Colorido e Indicadores */}
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute top-0 bottom-0 left-0 right-0 overflow-y-scroll overflow-x-hidden p-5 custom-scrollbar-vibrant">
            {GROUPS.map((group) => (
              <div key={group.label} className="mb-8 last:mb-4">
                <h4 className="text-[11px] text-accent font-black uppercase tracking-[0.2em] px-4 mb-4 flex items-center gap-2">
                   <div className="h-px flex-1 bg-accent/20" />
                   {group.label}
                   <div className="h-px flex-1 bg-accent/20" />
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  {group.items.map(item => {
                    const cost = CREDIT_COST[item.type] ?? 0
                    return (
                      <button
                        key={item.type}
                        onMouseDown={() => { onAdd(item.type); onClose() }}
                        className="group relative flex items-center gap-4 p-4 rounded-[26px] bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-accent/30 transition-all text-left active:scale-[0.95] shadow-sm overflow-hidden"
                      >
                        {/* Glow no hover */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-5 blur-xl transition-opacity animate-pulse`} />

                        {/* Squircle Apple Icon */}
                        <div className={`shrink-0 w-12 h-12 rounded-[16px] bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-lg group-hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all duration-500`}>
                          <div className="text-white drop-shadow-lg scale-110">
                             {item.icon}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 z-10">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[14px] font-black text-white leading-none tracking-tight">
                              {item.label}
                            </p>
                            {/* Valor Ultra Visível */}
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg ${
                              cost === 0 
                              ? 'bg-emerald-500 text-white animate-pulse' 
                              : 'bg-accent text-white border border-white/20'
                            }`}>
                              {cost === 0 ? 'GRÁTIS' : `${cost}cr`}
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

          {/* Seta de ajuda flutuante */}
          <div className="absolute bottom-6 right-6 pointer-events-none p-3 bg-accent rounded-full shadow-2xl animate-bounce border-2 border-white/10">
             <ChevronDown size={14} className="text-white" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-black/60 border-t border-white/5 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-2.5">
             <div className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse shadow-[0_0_12px_rgba(124,58,237,0.8)]" />
             <p className="text-[11px] font-black text-white tracking-widest uppercase">Estúdio Profissional</p>
           </div>
        </div>
      </div>

      <style jsx>{`
        /* Scrollbar VIBRANTE para maior visibilidade */
        .custom-scrollbar-vibrant::-webkit-scrollbar {
          width: 8px; /* Mais larga para ser vista */
        }
        .custom-scrollbar-vibrant::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
          border-radius: 20px;
          margin: 15px;
        }
        .custom-scrollbar-vibrant::-webkit-scrollbar-thumb {
          background: #7c3aed; /* Violeta Vibrante (O mesmo do Accent) */
          border-radius: 20px;
          border: 2px solid #0c0c0e; /* Espaço para parecer flutuante */
          box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
        }
        .custom-scrollbar-vibrant::-webkit-scrollbar-thumb:hover {
          background: #a78bfa;
        }
      `}</style>
    </>
  )
}
