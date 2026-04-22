'use client'

import { useCallback, useState } from 'react'
import { Lock, Upload, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadZoneProps {
  onFile: (file: File) => void
  disabled?: boolean
}

export default function UploadZone({ onFile, disabled }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const handle = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    onFile(file)
  }, [onFile])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handle(file)
  }

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handle(file)
  }

  if (preview) {
    return (
      <div className="panel-card relative aspect-[16/10] w-full overflow-hidden border border-white/10 bg-[#111111]">
        <img src={preview} alt="Preview" className="h-full w-full object-contain bg-[#0C0C0C]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/55 to-transparent" />
        <div className="absolute left-4 top-4">
          <span className="obsidian-chip border-[#54D6F6]/20 bg-[#0C171A] text-[#54D6F6]">arquivo carregado</span>
        </div>
        <button
          onClick={() => setPreview(null)}
          className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/70 px-4 py-2 font-label text-[10px] uppercase tracking-[0.24em] text-[#D7E4E8] transition-colors hover:border-[#54D6F6]/40 hover:text-white"
        >
          Trocar imagem
        </button>
        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-label text-[10px] uppercase tracking-[0.28em] text-[#54D6F6]">input pronto</p>
            <p className="mt-1 text-sm text-white">A imagem entrou no pipeline. Podemos diagnosticar e restaurar.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[#A8B5B8]">
            <Wand2 size={14} className="text-[#54D6F6]" />
            <span className="font-label text-[10px] uppercase tracking-[0.24em]">modo premium</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <label
      className={cn(
        'panel-card relative flex aspect-[16/10] w-full cursor-pointer flex-col items-center justify-center overflow-hidden border border-dashed px-6 text-center transition-all duration-300',
        dragging
          ? 'border-[#54D6F6]/60 bg-[#0C171A]'
          : 'border-white/10 bg-[#111111] hover:border-[#54D6F6]/35 hover:bg-[#101417]',
        disabled && 'pointer-events-none opacity-50',
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.tiff,.tif,.bmp"
        className="hidden"
        onChange={onChange}
        disabled={disabled}
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(84,214,246,0.12),_transparent_45%)]" />

      <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[#54D6F6]/20 bg-[#0C171A] text-[#54D6F6] shadow-[0_0_0_10px_rgba(84,214,246,0.06)]">
        <Upload size={24} />
      </div>

      <div className="relative mt-6 max-w-xl">
        <p className="font-label text-[10px] uppercase tracking-[0.34em] text-[#54D6F6]">upload de origem</p>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-white">Arraste sua foto para dentro do laboratorio</p>
        <p className="mt-3 text-sm leading-relaxed text-[#9EADB1]">
          Recebemos JPG, PNG, TIFF e BMP. O arquivo sobe para um ambiente isolado e segue direto para diagnostico e restauracao.
        </p>
      </div>

      <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2">
        {['JPG', 'PNG', 'TIFF', 'BMP', 'ate 50MB'].map((format) => (
          <span
            key={format}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.22em] text-[#A8B5B8]"
          >
            {format}
          </span>
        ))}
      </div>

      <div className="relative mt-6 flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-[#A8B5B8]">
        <Lock size={14} className="text-[#54D6F6]" />
        <span className="font-label text-[10px] uppercase tracking-[0.24em]">sua foto nao e compartilhada com terceiros</span>
      </div>
    </label>
  )
}
