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

interface Props {
  onAdd: (type: AssetType) => void
  disabled?: boolean
}

function Upload({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> }

export default function AddCardMenu({ onAdd, disabled }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={disabled}
        className={`flex items-center gap-2 text-white text-sm font-bold px-5 py-2.5 rounded-2xl transition-all disabled:opacity-50 shadow-lg ${
            open ? 'bg-zinc-800' : 'bg-accent hover:bg-accent/90 shadow-accent/20'
        }`}
      >
        {open ? <X size={16} /> : <Plus size={16} />}
        Adicionar card
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-4 w-[460px] bg-[#1c1c1e]/90 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-300 origin-top-right flex flex-col h-[520px]">
            
            {/* Header */}
            <div className="px-7 py-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-accent/20 rounded-2xl">
                  <MousePointer2 size={16} className="text-accent" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-white tracking-tight">Novos Equipamentos</h3>
                  <p className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.2em] mt-0.5">Painel de Ativos</p>
                </div>
              </div>
            </div>

            {/* List com Scroll Visível para Leigos */}
            <div className="flex-1 relative overflow-hidden">
               <div className="absolute top-0 bottom-0 left-0 right-0 overflow-y-scroll overflow-x-hidden p-4 custom-scrollbar-apple-menu">
                {GROUPS.map((group) => (
                    <div key={group.label} className="mb-6 last:mb-2">
                        <h4 className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-4 mb-3 flex items-center gap-2">
                            {group.label}
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-2">
                            {group.items.map(item => {
                                const cost = CREDIT_COST[item.type] ?? 0
                                return (
                                    <button
                                        key={item.type}
                                        onClick={() => { onAdd(item.type); setOpen(false) }}
                                        className="group relative flex items-center gap-3.5 p-3.5 rounded-[24px] bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all text-left active:scale-[0.96]"
                                    >
                                        {/* Squircle Apple Icon */}
                                        <div className={`shrink-0 w-11 h-11 rounded-[13px] bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform duration-500`}>
                                            <div className="text-white drop-shadow-sm scale-90">
                                                {item.icon}
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1">
                                                <p className="text-[13px] font-bold text-zinc-100 leading-none group-hover:text-white transition-colors">
                                                    {item.label}
                                                </p>
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${cost === 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-zinc-500'}`}>
                                                    {cost === 0 ? 'FREE' : `${cost}cr`}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-zinc-500 leading-tight mt-1.5 line-clamp-1">
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

               {/* Bouncing Arrow para guiar o cliente */}
               <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none animate-bounce flex flex-col items-center opacity-40">
                  <ChevronDown size={14} className="text-white" />
               </div>
            </div>

            <div className="px-8 py-4 bg-white/[0.03] border-t border-white/5 flex items-center justify-center gap-2 shrink-0">
              <Sparkles size={11} className="text-accent/60" />
              <p className="text-[9px] font-bold text-accent/60 tracking-wider uppercase tracking-[0.2em]">Experiência Unificada</p>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .custom-scrollbar-apple-menu::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar-apple-menu::-webkit-scrollbar-track {
          background: transparent;
          margin: 10px;
        }
        .custom-scrollbar-apple-menu::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15); /* Visível para guiar leigos */
          border-radius: 10px;
        }
      `}</style>
    </div>
  )
}
