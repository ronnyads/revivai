'use client'

import { useState } from 'react'
import { Plus, Image, Video, Mic, ZoomIn, FileText, Captions, X, User, Film, Sparkles, Layers, Wand2, Scissors, MousePointer2, ChevronDown } from 'lucide-react'
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

function Upload({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> }

export default function AddCardMenu({ onAdd, disabled }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={disabled}
        className={`flex items-center gap-2 text-white text-sm font-black px-6 py-3 rounded-2xl transition-all disabled:opacity-50 shadow-2xl ${
            open ? 'bg-zinc-800' : 'bg-accent hover:bg-accent/90 shadow-accent/40'
        }`}
      >
        {open ? <X size={16} /> : <Plus size={18} />}
        ADICIONAR CARD
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-4 w-[480px] bg-[#0c0c0e] border border-white/10 rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,1)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-300 origin-top-right flex flex-col h-[540px]">
            
            {/* Header High Contrast */}
            <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent rounded-[18px] shadow-lg shadow-accent/40">
                  <MousePointer2 size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-[18px] font-black text-white tracking-tight">Novos Equipamentos</h3>
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.25em] mt-0.5">Painel de Ativos Profissional</p>
                </div>
              </div>
            </div>

            {/* List com Scroll Violeta (Visível para Leigos) */}
            <div className="flex-1 relative overflow-hidden">
               <div className="absolute top-0 bottom-0 left-0 right-0 overflow-y-scroll overflow-x-hidden p-6 custom-scrollbar-vibrant-menu">
                {GROUPS.map((group) => (
                    <div key={group.label} className="mb-8 last:mb-2">
                        <h4 className="text-[11px] text-accent/80 font-black uppercase tracking-[0.2em] px-4 mb-4 flex items-center gap-3">
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
                                        onClick={() => { onAdd(item.type); setOpen(false) }}
                                        className="group relative flex items-center gap-4 p-4 rounded-[28px] bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-accent/30 transition-all text-left active:scale-[0.95] overflow-hidden"
                                    >
                                        <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-5 blur-xl transition-opacity`} />

                                        {/* Squircle Apple Icon */}
                                        <div className={`shrink-0 w-12 h-12 rounded-[17px] bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-xl group-hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all duration-500`}>
                                            <div className="text-white drop-shadow-md scale-110">
                                                {item.icon}
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0 z-10">
                                            <div className="flex items-center justify-between gap-1">
                                                <p className="text-[14px] font-black text-zinc-100 leading-none group-hover:text-white transition-colors">
                                                    {item.label}
                                                </p>
                                                {/* Preço Ultra Visível */}
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg ${
                                                    cost === 0 
                                                    ? 'bg-emerald-500 text-white animate-pulse' 
                                                    : 'bg-accent text-white border border-white/20'
                                                }`}>
                                                    {cost === 0 ? 'GRÁTIS' : `${cost}cr`}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-zinc-500 leading-tight mt-1.5 line-clamp-1 group-hover:text-zinc-300 transition-colors">
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

               {/* Bouncing Help Icon */}
               <div className="absolute bottom-6 right-8 pointer-events-none p-4 bg-accent rounded-full shadow-2xl animate-bounce border-2 border-white/10 z-20">
                  <ChevronDown size={16} className="text-white" />
               </div>
            </div>

            <div className="px-10 py-5 bg-black/60 border-t border-white/5 flex items-center justify-center gap-2 shrink-0">
              <Sparkles size={12} className="text-accent" />
              <p className="text-[10px] font-black text-white tracking-widest uppercase">Experiência Unificada Premium</p>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        /* Scrollbar VIBRANTE para maior visibilidade */
        .custom-scrollbar-vibrant-menu::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar-vibrant-menu::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
          border-radius: 20px;
          margin: 15px;
        }
        .custom-scrollbar-vibrant-menu::-webkit-scrollbar-thumb {
          background: #7c3aed; /* Violeta Vibrante */
          border-radius: 20px;
          border: 2px solid #0c0c0e;
        }
      `}</style>
    </div>
  )
}
