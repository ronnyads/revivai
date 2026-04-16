'use client'

import { useState } from 'react'
import { Plus, Image, Video, Mic, ZoomIn, FileText, Captions, X, User, Film, Sparkles, Layers, Wand2 } from 'lucide-react'
import { AssetType } from '@/types'

interface CardDef { type: AssetType; icon: React.ReactNode; label: string; desc: string; cost: number }

const GROUPS: { label: string; items: CardDef[] }[] = [
  {
    label: 'CRIAR',
    items: [
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
          <div className="absolute right-0 top-full mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl z-20 overflow-hidden">
            {GROUPS.map((group, gi) => (
              <div key={group.label}>
                {gi > 0 && <div className="h-px bg-zinc-800 mx-3" />}
                <p className="text-[9px] text-zinc-600 uppercase tracking-widest px-4 pt-3 pb-1 font-semibold">
                  {group.label}
                </p>
                {group.items.map(t => (
                  <button
                    key={t.type}
                    onClick={() => { onAdd(t.type); setOpen(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800 transition-colors text-left group"
                  >
                    <span className="text-zinc-400 group-hover:text-accent transition-colors">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{t.label}</p>
                      <p className="text-xs text-zinc-500">{t.desc}</p>
                    </div>
                    <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full shrink-0">
                      {t.cost} cr
                    </span>
                  </button>
                ))}
              </div>
            ))}
            <div className="h-2" />
          </div>
        </>
      )}
    </div>
  )
}
