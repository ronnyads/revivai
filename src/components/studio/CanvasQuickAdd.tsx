'use client'

import { useEffect, useRef } from 'react'
import { Image, Video, Mic, ZoomIn, FileText, Captions, User, Film, Sparkles, Layers, Wand2, Upload } from 'lucide-react'
import { AssetType } from '@/types'

interface CardDef {
  type: AssetType
  icon: React.ReactNode
  label: string
  desc: string
  cost: number
  badge?: string
}

const GROUPS: { label: string; items: CardDef[] }[] = [
  {
    label: 'Criar conteúdo',
    items: [
      { type: 'face',    icon: <Upload size={16} />,    label: 'Rosto Real',         desc: 'Traga um rosto ou personagem',       cost: 0 },
      { type: 'model',   icon: <User size={16} />,      label: 'Modelo UGC',         desc: 'Persona realista com IA',             cost: 1 },
      { type: 'script',  icon: <FileText size={16} />,  label: 'Script UGC',         desc: 'Texto viral pra conversão',           cost: 1 },
      { type: 'image',   icon: <Image size={16} />,     label: 'Imagem',             desc: 'Foto premium com IA',                 cost: 1 },
      { type: 'voice',   icon: <Mic size={16} />,       label: 'Voz',                desc: 'Locução hiper-realista',              cost: 1 },
    ],
  },
  {
    label: 'Vídeo com IA',
    items: [
      { type: 'video',   icon: <Video size={16} />,     label: 'Vídeo',              desc: 'Imagem animada em vídeo',             cost: 3 },
      { type: 'animate', icon: <Sparkles size={16} />,  label: 'Imitar Movimentos',  desc: 'Replique movimentos de um vídeo',     cost: 3 },
      { type: 'lipsync', icon: <Wand2 size={16} />,     label: 'Lip Sync',           desc: 'Sincronia labial com áudio',          cost: 3 },
    ],
  },
  {
    label: 'Finalizar',
    items: [
      { type: 'compose', icon: <Layers size={16} />,    label: 'Fusão UGC',          desc: 'Modelo + produto em 1 cena',          cost: 1 },
      { type: 'upscale', icon: <ZoomIn size={16} />,    label: 'Upscale',            desc: 'Foto para Ultra HD',                  cost: 1 },
      { type: 'caption', icon: <Captions size={16} />,  label: 'Legenda',            desc: 'Legendas sincronizadas',              cost: 1 },
      { type: 'render',  icon: <Film size={16} />,      label: 'Vídeo Final',        desc: 'Finalização com áudio',               cost: 1 },
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

  // Ajusta posição para não sair da tela
  const menuW = 280
  const menuH = 480
  const left = Math.min(x, window.innerWidth  - menuW - 12)
  const top  = Math.min(y, window.innerHeight - menuH - 12)

  return (
    <>
      {/* Backdrop invisível para fechar ao clicar fora */}
      <div className="fixed inset-0 z-40" onMouseDown={onClose} />

      <div
        ref={ref}
        style={{ left, top }}
        className="fixed z-50 w-[280px] bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 pt-3 pb-2 border-b border-zinc-800">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Adicionar card</p>
        </div>

        <div className="overflow-y-auto max-h-[440px] py-1">
          {GROUPS.map((group, gi) => (
            <div key={group.label}>
              {gi > 0 && <div className="h-px bg-zinc-800 mx-3 my-1" />}
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest px-4 pt-2 pb-1 font-semibold">
                {group.label}
              </p>
              {group.items.map(item => (
                <button
                  key={item.type}
                  onMouseDown={() => { onAdd(item.type); onClose() }}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-zinc-800/80 transition-colors text-left group"
                >
                  <span className="w-7 h-7 rounded-lg bg-zinc-800 group-hover:bg-accent/20 flex items-center justify-center text-zinc-400 group-hover:text-accent transition-colors shrink-0">
                    {item.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white leading-tight">{item.label}</p>
                    <p className="text-[11px] text-zinc-500 leading-tight">{item.desc}</p>
                  </div>
                  {item.cost > 0 && (
                    <span className="text-[10px] text-zinc-500 shrink-0">{item.cost}cr</span>
                  )}
                </button>
              ))}
            </div>
          ))}
          <div className="h-2" />
        </div>
      </div>
    </>
  )
}
