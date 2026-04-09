import { formatDate } from '@/lib/utils'
import { Download, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { Photo } from '@/types'
import DeletePhotoButton from './DeletePhotoButton'

const STATUS_MAP = {
  pending:    { icon: Clock,       color: 'text-muted',  label: 'Aguardando' },
  processing: { icon: Loader2,     color: 'text-accent', label: 'Processando' },
  done:       { icon: CheckCircle, color: 'text-green-600', label: 'Concluída' },
  error:      { icon: XCircle,     color: 'text-red-500', label: 'Erro' },
}

export default function PhotoCard({ photo }: { photo: Photo }) {
  const { icon: Icon, color, label } = STATUS_MAP[photo.status]

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-xl overflow-hidden hover:-translate-y-0.5 transition-transform duration-300 group">
      <div className="relative aspect-square bg-surface overflow-hidden">
        <img
          src={(photo.status === 'done' && photo.restored_url) ? photo.restored_url : photo.original_url}
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
      </div>
      <div className="p-4">
        <div className={`flex items-center gap-1.5 text-xs font-medium mb-2 ${color}`}>
          <Icon size={13} className={photo.status === 'processing' ? 'animate-spin' : ''} />
          {label}
        </div>
        {photo.model_used && (
          <p className="text-[11px] text-muted font-mono mb-2 truncate">{photo.model_used}</p>
        )}
        <p className="text-xs text-muted">{formatDate(photo.created_at)}</p>
        {photo.status === 'done' && photo.restored_url && (
          <a
            href={photo.restored_url}
            download
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-ink text-white text-xs font-medium hover:bg-accent transition-colors duration-200"
          >
            <Download size={13} /> Baixar
          </a>
        )}
        {photo.status === 'error' && (
          <DeletePhotoButton photoId={photo.id} />
        )}
      </div>
    </div>
  )
}
