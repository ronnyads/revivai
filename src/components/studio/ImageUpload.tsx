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
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/studio/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (data.url) {
        onChange(data.url)
      } else {
        setError(data.error ?? 'Erro no upload')
      }
    } catch {
      setError('Erro ao enviar arquivo')
    } finally {
      setUploading(false)
    }
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
      <div className="relative">
        <img src={value} alt="Preview" className="w-full rounded-xl object-cover max-h-48 border border-zinc-700" />
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
