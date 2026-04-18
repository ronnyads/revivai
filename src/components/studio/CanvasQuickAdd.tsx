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
  // Gradientes no estilo Apple (vibrantes e suaves)
  gradient: string 
}

const GROUPS: { label: string; items: CardDef[] }[] = [
  {
    label: 'Criação & IA Studio',
    items: [
      { type: 'face',    icon: <Upload size={20} />,    label: 'Rosto Real',   desc: 'Injetar face real',     gradient: 'from-[#34C759] to-[#30B753]' }, // Green
      { type: 'model',   icon: <User size={20} />,      label: 'Modelo UGC',   desc: 'Persona realista',      gradient: 'from-[#5856D6] to-[#AF52DE]' }, // Indigo/Purple
      { type: 'script',  icon: <FileText size={20} />,  label: 'Script Ad',    desc: 'Copy para vendas',      gradient: 'from-[#FF9500] to-[#FFCC00]' }, // orange/Yellow
      { type: 'image',   icon: <Image size={20} />,     label: 'Imagem IA',    desc: 'Foto de produto',       gradient: 'from-[#007AFF] to-[#00C7BE]' }, // Blue/Teal
      { type: 'voice',   icon: <Mic size={20} />,       label: 'Voz / Audio',  desc: 'Locução humana',        gradient: 'from-[#FF2D55] to-[#FF3B30]' }, // Pink/Red
    ],
  },
  {
    label: 'Motores de Movimento',
    items: [
      { type: 'video',   icon: <Video size={20} />,     label: 'Vídeo / Anima', desc: 'Sora / Kling AI',       gradient: 'from-[#141414] to-[#444444]' }, // Dark/Steel
      { type: 'animate', icon: <Sparkles size={20} />,  label: 'Movimentos',    desc: 'Replicar trejeitos',    gradient: 'from-[#FF375F] to-[#BF5AF2]' }, // Fuchsia
      { type: 'lipsync', icon: <Wand2 size={20} />,     label: 'Lip Sync',      desc: 'Sincronia real',        gradient: 'from-[#64D2FF] to-[#0A84FF]' }, // Sky
    ],
  },
  {
    label: 'Estúdio de Entrega',
    items: [
      { type: 'compose', icon: <Layers size={20} />,    label: 'Fusão UGC',     desc: 'Unir Ator+Produto',     gradient: 'from-[#FF9F0A] to-[#FFD60A]' }, // Amber
      { type: 'upscale', icon: <ZoomIn size={20} />,    label: 'Upscale 4K',    desc: 'Nitidez extrema',       gradient: 'from-[#30D158] to-[#66D4CF]' }, // Mint
      { type: 'caption', icon: <Captions size={20} />,  label: 'Legendas',      desc: 'Dinâmicas e cores',     gradient: 'from-[#BF5AF2] to-[#5E5CE6]' }, // Violet
      { type: 'render',  icon: <Film size={20} />,      label: 'Vídeo Final',   desc: 'Mix Render Master',     gradient: 'from-[#8E8E93] to-[#C7C7CC]' }, // Silver
      { type: 'join',    icon: <Scissors size={20} />,  label: 'Unir Clipes',   desc: 'Costura FFmpeg',        gradient: 'from-[#FF453A] to-[#FF3B30]' }, // Red
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

  // Layout Square Premium
  const menuW = 460 
  const menuH = 500
  const left = Math.min(x, window.innerWidth  - menuW - 16)
  const top  = Math.min(y, window.innerHeight - menuH - 16)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]" onMouseDown={onClose} />

      <div
        ref={ref}
        style={{ left, top }}
        className="fixed z-50 w-[460px] bg-[#1c1c1e]/90 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 fade-in duration-300 origin-top-left flex flex-col"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header Apple Style */}
        <div className="px-7 py-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-accent/20 rounded-2xl">
              <MousePointer2 size={16} className="text-accent" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-white tracking-tight">O que vamos criar?</h3>
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] mt-0.5">Studio Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
             <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-none">Status Online</span>
          </div>
        </div>

        {/* List Content com Scroll Visível e Mask */}
        <div className="flex-1 relative overflow-hidden group">
          {/* Scrollbar estilizada visível para o cliente leigo */}
          <div className="absolute top-0 bottom-0 left-0 right-0 overflow-y-scroll overflow-x-hidden p-4 custom-scrollbar-apple">
            {GROUPS.map((group) => (
              <div key={group.label} className="mb-6 last:mb-2">
                <h4 className="text-[11px] text-zinc-500 uppercase font-black tracking-[0.1em] px-4 mb-3">
                  {group.label}
                </h4>
                
                <div className="grid grid-cols-2 gap-2.5">
                  {group.items.map(item => {
                    const cost = CREDIT_COST[item.type] ?? 0
                    return (
                      <button
                        key={item.type}
                        onMouseDown={() => { onAdd(item.type); onClose() }}
                        className="group relative flex items-center gap-4 p-4 rounded-[24px] bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all text-left active:scale-[0.96] shadow-sm hover:shadow-xl"
                      >
                        {/* Apple Squircle Icon */}
                        <div className={`shrink-0 w-12 h-12 rounded-[14px] bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-[0_4px_12px_rgba(0,0,0,0.3)] group-hover:scale-105 transition-transform duration-500`}>
                          <div className="text-white drop-shadow-md">
                             {item.icon}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[14px] font-bold text-white leading-none tracking-tight">
                              {item.label}
                            </p>
                          </div>
                          <p className="text-[11px] text-zinc-500 leading-tight mt-1.5 line-clamp-1 group-hover:text-zinc-400 transition-colors">
                            {item.desc}
                          </p>
                          <div className="mt-2 text-[9px] font-black tracking-widest text-zinc-600 group-hover:text-accent/60 transition-colors uppercase flex items-center gap-1.5">
                             {cost === 0 ? 'Utilidade Gratuita' : `${cost} Créditos`}
                             {cost > 0 && <div className="w-1 h-1 bg-zinc-800 rounded-full" />}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          
          {/* Indicador visual de "rolar para baixo" no rodapé para leigos */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none animate-bounce flex flex-col items-center opacity-40">
             <span className="text-[8px] font-bold text-white uppercase tracking-tighter mb-1">Role para mais</span>
             <ChevronDown size={10} className="text-white" />
          </div>
        </div>

        {/* Footer Refinado */}
        <div className="px-8 py-4 bg-white/[0.03] border-t border-white/5 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
             <p className="text-[10px] font-bold text-accent tracking-wider uppercase">Alta Conversão</p>
           </div>
           <p className="text-[10px] text-zinc-600 font-medium tracking-tight">RevivAI Studio © 2026</p>
        </div>
      </div>

      <style jsx>{`
        /* Scrollbar estilo Apple macOS (fina e arredondada) */
        .custom-scrollbar-apple::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar-apple::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
          border-radius: 10px;
          margin: 10px;
        }
        .custom-scrollbar-apple::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15); /* Visível por padrão para guiar leigos */
          border-radius: 10px;
          border: 1px solid rgba(0,0,0,0.1);
        }
        .custom-scrollbar-apple::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.25);
        }
      `}</style>
    </>
  )
}
