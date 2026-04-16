'use client'

import { useState, useRef } from 'react'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'

interface Props {
  value: string
  onChange: (url: string) => void
  label?: string
  accept?: string
  preview?: boolean
}

export default function ImageUpload({ value, onChange, label = 'Imagem', accept = 'image/*', preview = true }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setError('')
    try {
      let finalFile = file;
      
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
    return new Promise((resolve, reject) => {
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
        ctx?.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(blob => {
          URL.revokeObjectURL(img.src)
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }))
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
  }

  // Se já tem URL e é imagem com preview
  if (value && preview && accept.startsWith('image')) {
    return (
      <div className="relative bg-zinc-900/50 rounded-xl overflow-hidden border border-zinc-700 flex items-center justify-center p-2 h-48">
        <img src={value} alt="Preview" className="w-full h-full rounded-lg object-contain" />
        <button
          onClick={() => onChange('')}
          className="absolute top-2 right-2 bg-zinc-900/80 hover:bg-red-900/80 text-white rounded-full p-1 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div>
      <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">{label}</label>
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-zinc-700 hover:border-accent/50 rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer transition-colors group"
      >
        {uploading ? (
          <>
            <Loader2 size={22} className="animate-spin text-accent" />
            <p className="text-xs text-zinc-400">Enviando...</p>
          </>
        ) : (
          <>
            <ImageIcon size={22} className="text-zinc-600 group-hover:text-accent transition-colors" />
            <p className="text-xs text-zinc-400 text-center">
              <span className="text-accent font-medium">Clique para escolher</span> ou arraste aqui
            </p>
            <p className="text-[10px] text-zinc-600">Da galeria ou do computador</p>
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
          className="w-full mt-2 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-400 placeholder-zinc-600 focus:outline-none focus:border-accent"
        />
      )}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
    </div>
  )
}
