'use client'

import { useState, useRef } from 'react'
import { X, Loader2, Image as ImageIcon } from 'lucide-react'

interface Props {
  value: string
  onChange: (url: string) => void
  label?: string
  accept?: string
  preview?: boolean
  frameClassName?: string
  compact?: boolean
}

export default function ImageUpload({
  value,
  onChange,
  label = 'Imagem',
  accept = 'image/*',
  preview = true,
  frameClassName,
  compact = false,
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setError('')
    try {
      let finalFile = file
      
      // Se for imagem e pesar mais que 1.5MB, comprimimos no client para não bater no 4.5MB limit da Vercel
      if (file.type.startsWith('image/') && file.size > 1.5 * 1024 * 1024) {
        finalFile = await compressImage(file)
      }

      const form = new FormData()
      form.append('file', finalFile)
      const res = await fetch('/api/studio/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (data.url) {
        onChange(data.url)
      } else {
        setError(data.error ?? 'Erro no upload')
      }
    } catch {
      setError('Erro ao enviar arquivo. O arquivo pode ser muito pesado.')
    } finally {
      setUploading(false)
    }
  }

  function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const img = new globalThis.Image()
      img.src = URL.createObjectURL(file)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        
        // Max dimensions (e.g. 1920x1080 -> scale down proportionally)
        const MAX_SIZE = 1600
        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width
          width = MAX_SIZE
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height
          height = MAX_SIZE
        }
        
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(img.src)
          resolve(file)
          return
        }

        // Mantem PNG consistente ao converter para JPG, evitando fundo preto/transparencia estranha.
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(blob => {
          URL.revokeObjectURL(img.src)
          if (blob) {
            const safeName = file.name.replace(/\.[^.]+$/, '') || 'image'
            resolve(new File([blob], `${safeName}.jpg`, { type: 'image/jpeg' }))
          } else {
            resolve(file)
          }
        }, 'image/jpeg', 0.8)
      }
      img.onerror = () => resolve(file)
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  // Se já tem URL e é imagem com preview
  if (value && preview && accept.startsWith('image')) {
    return (
      <div className={`relative overflow-hidden rounded-xl group shadow-md border border-zinc-800/50 ${frameClassName ?? ''}`}>
        <img src={value} alt="Preview" className="h-full w-full rounded-xl object-cover" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-2 pointer-events-none">
          {/* Fundo escuro sutil on hover */}
        </div>
        <button
          onClick={() => onChange('')}
          className="absolute top-2 right-2 bg-zinc-900/80 hover:bg-red-500 text-white rounded-full p-1.5 transition-colors opacity-0 group-hover:opacity-100 pointer-events-auto shadow-lg backdrop-blur-sm"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div>
      <label className="mb-2 block px-1 font-label text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</label>
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[18px] border border-dashed border-white/10 bg-[#0B0D0F] transition-colors group hover:border-white/16 ${compact ? 'p-3' : 'p-5'} ${frameClassName ?? ''}`}
      >
        {uploading ? (
          <>
            <Loader2 size={22} className="animate-spin text-[#54D6F6]" />
            <p className="text-xs text-white/56">Enviando...</p>
          </>
        ) : (
          <>
            <ImageIcon size={22} className="text-white/24 transition-colors group-hover:text-[#54D6F6]" />
            <p className={`text-center text-white/48 ${compact ? 'text-[11px]' : 'text-xs'}`}>
              <span className="font-medium text-[#8EDDED]">Clique para escolher</span> ou arraste aqui
            </p>
            <p className={`${compact ? 'text-[9px]' : 'text-[10px]'} text-white/28`}>Da galeria ou do computador</p>
          </>
        )}
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      {/* Fallback URL manual */}
      {!uploading && (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Ou cole uma URL..."
          className="mt-2 w-full rounded-[16px] border border-white/8 bg-[#0B0D0F] px-3 py-2.5 text-xs text-white/62 outline-none transition-colors placeholder:text-white/22 focus:border-[#54D6F6]/30"
        />
      )}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
    </div>
  )
}
