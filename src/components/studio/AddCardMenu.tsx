'use client'

import { useState } from 'react'
import { Plus, Image, Video, Mic, ZoomIn, FileText, Captions, X, User, Film, Sparkles, Layers, Wand2 } from 'lucide-react'
import { AssetType } from '@/types'

interface CardDef { type: AssetType; icon: React.ReactNode; label: string; desc: string; cost: number }

const GROUPS: { label: string; items: CardDef[] }[] = [
  {
    label: 'CRIAR',
    items: [
      { type: 'face',    icon: <User size={18} />,     label: 'Rosto Real (Upload)',desc: 'Traga um rosto real ou personagem',        cost: 0 },
      { type: 'model',   icon: <User size={18} />,     label: 'Modelo UGC',        desc: 'Persona visual realista com IA',           cost: 1 },
      { type: 'script',  icon: <FileText size={18} />, label: 'Script UGC',         desc: 'Texto viral otimizado pra conversão',      cost: 1 },
      { type: 'image',   icon: <Image size={18} />,    label: 'Imagem',             desc: 'Foto premium de produto com IA',          cost: 1 },
      { type: 'voice',   icon: <Mic size={18} />,      label: 'Voz',                desc: 'Locução humana hiper-realista',            cost: 1 },
    ],
  },
  {
    label: 'VÍDEO',
    items: [
      { type: 'video',   icon: <Video size={18} />,    label: 'Vídeo',              desc: 'Animador fluido de imagem para vídeo',    cost: 3 },
      { type: 'animate', icon: <Sparkles size={18} />, label: 'Imitar Movimentos',  desc: 'Replique movimentos de um vídeo',         cost: 3 },
      { type: 'lipsync', icon: <Wand2 size={18} />,    label: 'Lip Sync',           desc: 'Sincronia labial perfeita com áudio',     cost: 3 },
    ],
  },
  {
    label: 'FINALIZAR',
    items: [
      { type: 'compose', icon: <Layers size={18} />,   label: 'Fusão UGC',          desc: 'Merge inteligente de modelo e produto',   cost: 1 },
      { type: 'upscale', icon: <ZoomIn size={18} />,   label: 'Upscale',            desc: 'Restaurar foto para Ultra HD',            cost: 1 },
      { type: 'caption', icon: <Captions size={18} />, label: 'Legenda',            desc: 'Legendas dinâmicas sincronizadas',        cost: 1 },
      { type: 'render',  icon: <Film size={18} />,     label: 'Vídeo Final',        desc: 'Finalização cinematográfica',             cost: 1 },
      { type: 'join',    icon: <Film size={18} />,     label: '🎬 Exportar MP4 Master', desc: 'Costura vídeos em 1 arquivo final',    cost: 0 },
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
        className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-accent/20"
      >
        {open ? <X size={16} /> : <Plus size={16} />}
        Adicionar card
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-4 w-80 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header decorativo */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-fuchsia-500 to-accent/50 opacity-50" />
            
            <div className="py-2">
              {GROUPS.map((group, gi) => (
                <div key={group.label} className="mb-2 last:mb-0">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] px-6 pt-4 pb-2 font-bold opacity-60">
                    {group.label}
                  </p>
                  <div className="px-2">
                    {group.items.map(t => (
                      <button
                        key={t.type}
                        onClick={() => { onAdd(t.type); setOpen(false) }}
                        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/5 rounded-2xl transition-all duration-300 text-left group relative outline-none focus:bg-white/10"
                      >
                        <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center text-zinc-400 group-hover:bg-accent/20 group-hover:text-accent transition-all duration-500 border border-white/5">
                          {t.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-zinc-100 group-hover:text-white transition-colors">{t.label}</p>
                          <p className="text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors line-clamp-1">{t.desc}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[9px] font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full shrink-0 group-hover:bg-accent group-hover:text-white transition-all duration-500">
                            {t.cost} CR
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
