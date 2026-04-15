'use client'

import { useState } from 'react'
import { Plus, Image, Video, Mic, ZoomIn, FileText, Captions, X, User, Film, Sparkles, Layers } from 'lucide-react'
import { AssetType } from '@/types'

const TYPES: { type: AssetType; icon: React.ReactNode; label: string; desc: string; cost: number }[] = [
  { type: 'model',   icon: <User size={18} />,        label: 'Modelo UGC',   desc: 'Persona visual com GPT-4o',    cost: 1 },
  { type: 'script',  icon: <FileText size={18} />,    label: 'Script UGC',   desc: 'Texto viral com GPT-4o',       cost: 1 },
  { type: 'image',   icon: <Image size={18} />,       label: 'Imagem',       desc: 'Foto de produto com DALL-E 3', cost: 1 },
  { type: 'voice',   icon: <Mic size={18} />,         label: 'Voz',          desc: 'Locução com ElevenLabs',       cost: 1 },
  { type: 'caption', icon: <Captions size={18} />,    label: 'Legenda',      desc: 'Legenda .srt com Whisper',     cost: 1 },
  { type: 'upscale', icon: <ZoomIn size={18} />,      label: 'Upscale',      desc: 'Foto em HD com Real-ESRGAN',   cost: 1 },
  { type: 'video',   icon: <Video size={18} />,       label: 'Vídeo',        desc: 'Vídeo UGC com Kling AI',       cost: 3 },
  { type: 'render',  icon: <Film size={18} />,        label: 'Vídeo Final',  desc: 'Merge vídeo + voz em MP4',     cost: 1 },
  { type: 'animate', icon: <Sparkles size={18} />,   label: 'Animar Modelo', desc: 'Seu rosto → persona via LivePortrait', cost: 3 },
  { type: 'compose', icon: <Layers size={18} />,     label: 'Compor Cena',   desc: 'Produto real + modelo pixel-perfect', cost: 1 },
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
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest px-4 pt-3 pb-2 font-medium">Escolha o tipo</p>
            {TYPES.map(t => (
              <button
                key={t.type}
                onClick={() => { onAdd(t.type); setOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors text-left group"
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
        </>
      )}
    </div>
  )
}
