'use client'

import { useState } from 'react'
import { XCircle, Loader2 } from 'lucide-react'
import { deleteFailedPhoto } from '@/app/dashboard/actions'

export default function DeletePhotoButton({ photoId }: { photoId: string }) {
  const [isDeleting, setIsDeleting] = useState(false)

  return (
    <button
      onClick={async () => {
        setIsDeleting(true)
        await deleteFailedPhoto(photoId)
        setIsDeleting(false)
      }}
      disabled={isDeleting}
      className={`mt-3 flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-red-200 text-red-500 text-xs font-medium hover:bg-red-50 transition-colors duration-200 ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
      {isDeleting ? 'Descartando...' : 'Descartar'}
    </button>
  )
}
