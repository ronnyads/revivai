'use client'

import Link from 'next/link'
import { Plus, Clock, CheckCircle, Loader2, Upload, Images, Wand2, CreditCard, Megaphone } from 'lucide-react'
import PhotoCard from '@/components/ui/PhotoCard'
import { useT } from '@/contexts/LanguageContext'

interface Photo {
  id: string
  status: string
  restored_url: string | null
  created_at: string
  original_url?: string
  [key: string]: unknown
}

interface Props {
  userHandle: string
  photos: Photo[]
  credits: number
  totalPhotos: number
  donePhotos: number
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `há ${days} dia${days > 1 ? 's' : ''}`
  if (hours > 0) return `há ${hours} hora${hours > 1 ? 's' : ''}`
  if (mins > 0) return `há ${mins} min`
  return 'agora mesmo'
}

export default function DashboardContent({ userHandle, photos, credits, totalPhotos, donePhotos }: Props) {
  const t = useT()
  const pending = photos.filter(p => p.status === 'pending' || p.status === 'processing').length

  return (
    <div className="min-h-screen bg-[#F8F6F1] font-sans">

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-neutral-100 px-8 md:px-12 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400 mb-2">REVIVAI — DASHBOARD</p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 font-display">
              Minha Galeria Ethereal
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Gerencie suas memórias restauradas com a potência da Inteligência Artificial RevivAI.
            </p>
          </div>

          <Link
            href="/dashboard/upload"
            className="inline-flex items-center gap-2 bg-neutral-900 text-white text-xs font-bold uppercase tracking-[0.2em] px-8 py-4 hover:bg-neutral-700 transition-colors shrink-0"
          >
            <Plus size={14} /> Nova Restauração
          </Link>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="bg-white border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-8 md:px-12 py-6 flex flex-wrap gap-10">
          {[
            { label: 'Total de fotos', value: totalPhotos, icon: <Images size={16} className="text-neutral-400" /> },
            { label: 'Concluídas', value: donePhotos, icon: <CheckCircle size={16} className="text-emerald-500" /> },
            { label: 'Em processo', value: pending, icon: <Loader2 size={16} className="text-amber-500" /> },
            { label: 'Créditos', value: credits, icon: <CreditCard size={16} className="text-neutral-400" /> },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3">
              {s.icon}
              <div>
                <div className="text-2xl font-bold font-display text-neutral-900 leading-none">{s.value.toLocaleString('pt-BR')}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mt-0.5">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto px-8 md:px-12 py-10">
        {photos.length > 0 ? (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400 mb-6">
              SUAS MEMÓRIAS — {photos.length} {photos.length === 1 ? 'FOTO' : 'FOTOS'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {photos.map(photo => (
                <PhtoCardLight key={photo.id} photo={photo} credits={credits} />
              ))}
            </div>
          </>
        ) : (
          /* ── Empty State ── */
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 bg-neutral-100 flex items-center justify-center mb-8">
              <Upload size={32} className="text-neutral-300" />
            </div>
            <h2 className="text-2xl font-bold font-display text-neutral-900 mb-3">
              Dê vida a mais memórias
            </h2>
            <p className="text-sm text-neutral-500 max-w-sm mb-10 leading-relaxed">
              Arraste e solte fotos antigas aqui ou use o botão abaixo para começar uma nova restauração cinematográfica.
            </p>
            <Link
              href="/dashboard/upload"
              className="inline-flex items-center gap-2 bg-neutral-900 text-white text-xs font-bold uppercase tracking-[0.2em] px-10 py-4 hover:bg-neutral-700 transition-colors"
            >
              <Plus size={14} /> Começar Agora
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Inline Light PhotoCard ── */
function PhtoCardLight({ photo, credits }: { photo: Photo; credits: number }) {
  const displayUrl = photo.status === 'done'
    ? (photo.restored_url || photo.original_url)
    : photo.original_url

  const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending:    { label: 'Aguardando', color: 'text-neutral-400', icon: <Clock size={12} /> },
    processing: { label: 'Restaurando...', color: 'text-amber-500', icon: <Loader2 size={12} className="animate-spin" /> },
    done:       { label: 'Concluída', color: 'text-emerald-600', icon: <CheckCircle size={12} /> },
    error:      { label: 'Erro', color: 'text-red-500', icon: null },
  }

  const s = statusMap[photo.status] ?? statusMap.error

  return (
    <div className="bg-white group overflow-hidden hover:shadow-lg transition-shadow duration-500">
      <div className="relative aspect-[4/3] bg-neutral-50 overflow-hidden">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Foto restaurada"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-200">
            <Images size={32} />
          </div>
        )}
        {photo.status === 'processing' && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
            <Loader2 size={24} className="text-neutral-700 animate-spin" />
          </div>
        )}
      </div>

      <div className="p-4">
        <p className="text-xs font-bold text-neutral-900 truncate mb-1">
          {(photo.original_url as string)?.split('/').pop()?.split('.')[0] ?? 'Foto restaurada'}
        </p>
        <div className={`flex items-center gap-1.5 text-[11px] font-medium ${s.color}`}>
          {s.icon} {s.label}
          {photo.status === 'done' && (
            <span className="ml-auto text-[10px] text-neutral-400">
              {timeAgo(photo.created_at)}
            </span>
          )}
        </div>

        {photo.status === 'done' && photo.restored_url && (
          <a
            href={photo.restored_url}
            download
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center justify-center gap-1 w-full py-2 bg-neutral-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-700 transition-colors"
          >
            Baixar
          </a>
        )}
      </div>
    </div>
  )
}
