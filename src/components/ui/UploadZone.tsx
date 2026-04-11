'use client'
import { useCallback, useState } from 'react'
import { Upload, Image as ImageIcon } from 'lucide-react'
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
      <div className="relative w-full rounded-xl overflow-hidden border border-[#E8E8E8] aspect-video">
        <img src={preview} alt="Preview" className="w-full h-full object-contain bg-surface" />
        <button
          onClick={() => setPreview(null)}
          className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-ink text-xs font-medium px-3 py-1.5 rounded-full border border-[#E8E8E8] hover:border-accent hover:text-accent transition-colors"
        >
          Trocar foto
        </button>
      </div>
    )
  }

  return (
    <label
      className={cn(
        'flex flex-col items-center justify-center gap-4 w-full rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 aspect-video',
        dragging ? 'border-accent bg-accent-light' : 'border-[#E8E8E8] bg-surface hover:border-accent hover:bg-accent-light',
        disabled && 'opacity-50 pointer-events-none'
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input type="file" accept=".jpg,.jpeg,.png,.tiff,.tif,.bmp" className="hidden" onChange={onChange} disabled={disabled} />
      <div className="w-14 h-14 rounded-full bg-accent-light flex items-center justify-center text-accent">
        <Upload size={24} />
      </div>
      <div className="text-center">
        <p className="text-base font-medium text-ink">Arraste sua foto aqui</p>
        <p className="text-sm text-muted mt-1">ou toque para escolher do celular / computador</p>
      </div>
      <div className="flex gap-2 flex-wrap justify-center">
        {['JPG','PNG','TIFF','BMP'].map(f => (
          <span key={f} className="text-xs px-2.5 py-1 rounded bg-white border border-[#E8E8E8] text-muted font-medium">{f}</span>
        ))}
        <span className="text-xs px-2.5 py-1 rounded bg-white border border-[#E8E8E8] text-muted font-medium">até 50MB</span>
      </div>
      <p className="text-[11px] text-muted mt-1">Sua foto não é compartilhada com ninguém</p>
    </label>
  )
}
