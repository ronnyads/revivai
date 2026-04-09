'use client'

import { useState } from 'react'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { deleteFailedPhoto } from '@/app/dashboard/actions'

export default function DeletePhotoButton({ photoId }: { photoId: string }) {
  const [confirm, setConfirm]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await deleteFailedPhoto(photoId)
    setDeleting(false)
  }

  if (confirm) {
    return (
      <div className="mt-1 rounded-lg border border-red-200 bg-red-50 p-3 flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-[11px] text-red-600 font-medium">
          <AlertTriangle size={12} /> Esta ação é permanente e não pode ser desfeita.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            {deleting ? 'Excluindo...' : 'Sim, excluir'}
          </button>
          <button
            onClick={() => setConfirm(false)}
            disabled={deleting}
            className="flex-1 py-1.5 rounded-md border border-[#E8E8E8] text-xs text-muted hover:bg-surface transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="mt-1 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-[#E8E8E8] text-red-400 text-xs font-medium hover:border-red-200 hover:bg-red-50 transition-colors duration-200"
    >
      <Trash2 size={13} /> Excluir foto
    </button>
  )
}
