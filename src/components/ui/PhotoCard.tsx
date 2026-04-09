'use client'

import { useState } from 'react'
import { formatDate } from '@/lib/utils'
import { Download, Clock, CheckCircle, XCircle, Loader2, Palette, Maximize2 } from 'lucide-react'
import type { Photo } from '@/types'
import DeletePhotoButton from './DeletePhotoButton'

const STATUS_MAP = {
  pending:    { icon: Clock,       color: 'text-muted',     label: 'Aguardando' },
  processing: { icon: Loader2,     color: 'text-accent',    label: 'Processando' },
  done:       { icon: CheckCircle, color: 'text-green-600', label: 'Concluída' },
  error:      { icon: XCircle,     color: 'text-red-500',   label: 'Erro' },
}

export default function PhotoCard({ photo, credits = 0 }: { photo: Photo; credits?: number }) {
  const { icon: Icon, color, label } = STATUS_MAP[photo.status]
  const [colorizationUrl, setColorizationUrl] = useState(photo.colorization_url ?? null)
  const [upscaleUrl, setUpscaleUrl]           = useState(photo.upscale_url ?? null)
  const [colorizing, setColorizing]           = useState(false)
  const [upscaling, setUpscaling]             = useState(false)
  const [colorError, setColorError]           = useState<string | null>(null)
  const [upscaleError, setUpscaleError]       = useState<string | null>(null)

  // Show best available image: upscaled > colorized > restored > original
  const displayUrl = photo.status === 'done'
    ? (upscaleUrl || colorizationUrl || photo.restored_url || photo.original_url)
    : photo.original_url

  async function handleColorize() {
    if (credits < 1) { setColorError('Sem créditos'); return }
    setColorizing(true); setColorError(null)
    try {
      const res = await fetch('/api/colorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: photo.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao colorir')
      setColorizationUrl(data.colorization_url)
    } catch (e: any) { setColorError(e.message) }
    finally { setColorizing(false) }
  }

  async function handleUpscale() {
    if (credits < 1) { setUpscaleError('Sem créditos'); return }
    setUpscaling(true); setUpscaleError(null)
    try {
      const res = await fetch('/api/upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: photo.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro no upscale')
      setUpscaleUrl(data.upscale_url)
    } catch (e: any) { setUpscaleError(e.message) }
    finally { setUpscaling(false) }
  }

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-xl overflow-hidden hover:-translate-y-0.5 transition-transform duration-300 group">
      <div className="relative aspect-square bg-surface overflow-hidden">
        <img
          src={displayUrl!}
          alt="Foto"
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
        />
        {photo.status === 'processing' && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={28} className="text-accent animate-spin" />
              <span className="text-xs font-medium text-ink">Restaurando...</span>
            </div>
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {upscaleUrl && (
            <span className="bg-purple-600/80 text-white text-[10px] px-2 py-0.5 rounded-full">4x</span>
          )}
          {colorizationUrl && !upscaleUrl && (
            <span className="bg-amber-500/80 text-white text-[10px] px-2 py-0.5 rounded-full">cor</span>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className={`flex items-center gap-1.5 text-xs font-medium mb-2 ${color}`}>
          <Icon size={13} className={photo.status === 'processing' ? 'animate-spin' : ''} />
          {label}
        </div>
        {photo.model_used && (
          <p className="text-[11px] text-muted font-mono mb-2 truncate">{photo.model_used}</p>
        )}
        <p className="text-xs text-muted mb-3" suppressHydrationWarning>{formatDate(photo.created_at)}</p>

        {photo.status === 'done' && (
          <div className="flex flex-col gap-2">
            {/* Downloads */}
            <a href={photo.restored_url!} download target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-ink text-white text-xs font-medium hover:bg-accent transition-colors duration-200">
              <Download size={13} /> Baixar restaurada
            </a>
            {colorizationUrl && (
              <a href={colorizationUrl} download target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition-colors duration-200">
                <Download size={13} /> Baixar colorida
              </a>
            )}
            {upscaleUrl && (
              <a href={upscaleUrl} download target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors duration-200">
                <Download size={13} /> Baixar 4x
              </a>
            )}

            {/* Actions */}
            {!colorizationUrl && (
              <button onClick={handleColorize} disabled={colorizing || credits < 1}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-amber-400 text-amber-700 bg-amber-50 text-xs font-medium hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {colorizing
                  ? <><Loader2 size={13} className="animate-spin" /> Colorindo...</>
                  : <><Palette size={13} /> Colorizar — 1 crédito</>}
              </button>
            )}
            {colorError && <p className="text-[11px] text-red-500 text-center">{colorError}</p>}

            {!upscaleUrl && (
              <button onClick={handleUpscale} disabled={upscaling || credits < 1}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-purple-400 text-purple-700 bg-purple-50 text-xs font-medium hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {upscaling
                  ? <><Loader2 size={13} className="animate-spin" /> Ampliando 4x...</>
                  : <><Maximize2 size={13} /> Ampliar 4x — 1 crédito</>}
              </button>
            )}
            {upscaleError && <p className="text-[11px] text-red-500 text-center">{upscaleError}</p>}
          </div>
        )}

        {photo.status === 'error' && <DeletePhotoButton photoId={photo.id} />}
      </div>
    </div>
  )
}
