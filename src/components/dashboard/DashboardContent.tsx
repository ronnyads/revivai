'use client'

import Link from 'next/link'
import { Plus, Hand } from 'lucide-react'
import PhotoCard from '@/components/ui/PhotoCard'
import { useT } from '@/contexts/LanguageContext'

interface Photo {
  id: string
  status: string
  restored_url: string | null
  [key: string]: unknown
}

interface Props {
  userHandle: string
  photos: Photo[]
  credits: number
  totalPhotos: number
  donePhotos: number
}

export default function DashboardContent({ userHandle, photos, credits, totalPhotos, donePhotos }: Props) {
  const t = useT()

  return (
    <main className="max-w-6xl mx-auto px-6 md:px-12 py-10 md:py-16">
      <div className="mb-10">
        <h1 className="font-display text-4xl font-normal tracking-tight mb-1 flex items-center gap-3">
          {t('dash_greeting')}, {userHandle} <Hand size={32} className="text-accent" aria-hidden="true" />
        </h1>
        <p className="text-muted text-sm border-l-2 border-accent pl-2 mt-2">
          {t('dash_subtitle')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
        {[
          { label: t('dash_stat_total'),   value: totalPhotos },
          { label: t('dash_stat_done'),    value: donePhotos },
          { label: t('dash_stat_credits'), value: credits },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border border-[#E8E8E8] p-5 md:p-6 transition-all hover:border-accent/40 hover:shadow-md">
            <div className="font-display text-4xl font-normal tracking-tight mb-1 text-ink">{s.value}</div>
            <div className="text-sm text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Photos */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {photos.map(photo => <PhotoCard key={photo.id} photo={photo as any} credits={credits} />)}
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-[#E8E8E8] rounded-2xl p-10 md:p-20 text-center">
          <p className="font-display text-3xl font-normal mb-3">{t('dash_empty_title')}</p>
          <p className="text-muted text-sm mb-8">{t('dash_empty_sub')}</p>
          <Link
            href="/dashboard/upload"
            className="inline-flex items-center justify-center gap-2 bg-ink text-white text-sm font-medium px-6 py-3 rounded-xl hover:bg-accent hover:-translate-y-0.5 transition-all shadow-lg shadow-ink/10 w-full sm:w-auto"
          >
            <Plus size={16} /> {t('dash_empty_btn')}
          </Link>
        </div>
      )}
    </main>
  )
}
