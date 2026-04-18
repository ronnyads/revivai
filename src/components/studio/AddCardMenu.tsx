'use client'

import { useState } from 'react'
import { Plus, Image, Video, Mic, ZoomIn, FileText, Captions, X, User, Film, Sparkles, Layers, Wand2, Scissors, MousePointer2 } from 'lucide-react'
import { AssetType } from '@/types'
import { CREDIT_COST } from '@/constants/studio'

interface CardDef {
  type: AssetType
  icon: React.ReactNode
  label: string
  desc: string
  color: string
}

const GROUPS: { label: string; items: CardDef[] }[] = [
  {
    label: 'Criação & Assets',
    items: [
      { type: 'face',    icon: <User size={18} />,     label: 'Rosto Real',   desc: 'Upload de face',        color: 'from-blue-500' },
      { type: 'model',   icon: <User size={18} />,     label: 'Modelo UGC',   desc: 'Persona com IA',        color: 'from-indigo-500' },
      { type: 'script',  icon: <FileText size={18} />, label: 'Script Ad',    desc: 'Texto para vídeo',      color: 'from-amber-500' },
      { type: 'image',   icon: <Image size={18} />,    label: 'Imagem IA',    desc: 'Foto de produto',       color: 'from-emerald-500' },
      { type: 'voice',   icon: <Mic size={18} />,      label: 'Voz / Áudio',  desc: 'Locução humana',        color: 'from-rose-500' },
    ],
  },
  {
    label: 'Motores de Vídeo',
    items: [
      { type: 'video',   icon: <Video size={18} />,    label: 'Vídeo / Anima', desc: 'Kling ou Google',       color: 'from-cyan-500' },
      { type: 'animate', icon: <Sparkles size={18} />, label: 'Movimentos',    desc: 'Replicar dança/face',   color: 'from-fuchsia-500' },
      { type: 'lipsync', icon: <Wand2 size={18} />,    label: 'Lip Sync',      desc: 'Sincronia labial',      color: 'from-sky-500' },
    ],
  },
  {
    label: 'Post-Production',
    items: [
      { type: 'compose', icon: <Layers size={18} />,   label: 'Fusão UGC',     desc: 'Modelo + Produto',      color: 'from-orange-500' },
      { type: 'upscale', icon: <ZoomIn size={18} />,   label: 'Upscale 4K',    desc: 'Restaurar fotos',       color: 'from-teal-500' },
      { type: 'caption', icon: <Captions size={18} />, label: 'Legendas',      desc: 'Corte e legenda',       color: 'from-violet-500' },
      { type: 'render',  icon: <Film size={18} />,     label: 'Finalização',   desc: 'Merge Vídeo+Áudio',     color: 'from-pink-500' },
      { type: 'join',    icon: <Scissors size={18} />, label: 'Unir Clipes',   desc: 'Concat via FFmpeg',     color: 'from-red-500' },
    ],
  },
]

interface Props {
  onAdd: (type: AssetType) => void
  disabled?: boolean
}

export default function AddCardMenu({ onAdd, disabled }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={disabled}
        className={`flex items-center gap-2 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 shadow-lg ${
            open ? 'bg-zinc-800' : 'bg-accent hover:bg-accent/90 shadow-accent/20'
        }`}
      >
        {open ? <X size={16} /> : <Plus size={16} />}
        Adicionar card
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-4 w-[460px] bg-zinc-950/90 backdrop-blur-xl border border-white/10 rounded-[28px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
            
            <div className="px-6 py-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-accent/20 rounded-xl">
                  <MousePointer2 size={16} className="text-accent" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-white tracking-tight">Painel de Criação</h3>
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.15em] mt-0.5">God Mode Activated</p>
                </div>
              </div>
            </div>

            <div className="p-3 overflow-y-auto max-h-[500px] custom-scrollbar">
              {GROUPS.map((group) => (
                <div key={group.label} className="mb-4 last:mb-0">
                  <h4 className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-3 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                    {group.label}
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map(item => {
                      const cost = CREDIT_COST[item.type] ?? 0
                      return (
                        <button
                          key={item.type}
                          onClick={() => { onAdd(item.type); setOpen(false) }}
                          className="group relative flex items-start gap-3 p-3.5 rounded-[20px] bg-white/[0.03] border border-white/5 hover:bg-white/[0.07] hover:border-white/10 transition-all text-left overflow-hidden active:scale-[0.97]"
                        >
                          {/* Ícone Container Compacto */}
                          <div className={`shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br ${item.color} to-transparent p-[1px] opacity-80 group-hover:opacity-100 transition-all`}>
                            <div className="w-full h-full bg-zinc-950 rounded-[15px] flex items-center justify-center text-white">
                              {item.icon}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 py-0.5">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-[12px] font-bold text-zinc-100 leading-none group-hover:text-white transition-colors">
                                {item.label}
                              </p>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${cost === 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-zinc-400'}`}>
                                {cost === 0 ? 'FREE' : `${cost}CR`}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 leading-tight mt-1 line-clamp-1">
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

            <div className="px-6 py-3 bg-accent/5 border-t border-accent/10 flex items-center justify-center gap-2">
              <Sparkles size={11} className="text-accent/60" />
              <p className="text-[9px] font-bold text-accent/60 tracking-wider uppercase">Interface Unificada Premium</p>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  )
}
