export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PhotoCard from '@/components/ui/PhotoCard'
import { Plus } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: photos }] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('photos').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  return (
    <main className="max-w-6xl mx-auto px-6 md:px-12 py-10 md:py-16">
      <div className="mb-10">
        <h1 className="font-display text-4xl font-normal tracking-tight mb-1">
          Olá, {user.email?.split('@')[0]} 👋
        </h1>
        <p className="text-muted text-sm border-l-2 border-accent pl-2 mt-2">
          Aqui estão suas fotos restauradas.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
        {[
          { label: 'Total de fotos', value: photos?.length ?? 0 },
          { label: 'Concluídas', value: photos?.filter(p => p.status === 'done').length ?? 0 },
          { label: 'Créditos restantes', value: profile?.credits ?? 0 },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border border-[#E8E8E8] p-5 md:p-6 transition-all hover:border-accent/40 hover:shadow-md">
            <div className="font-display text-4xl font-normal tracking-tight mb-1 text-ink">{s.value}</div>
            <div className="text-sm text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Photo grid */}
      {photos && photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {photos.map(photo => <PhotoCard key={photo.id} photo={photo} />)}
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-[#E8E8E8] rounded-2xl p-10 md:p-20 text-center">
          <p className="font-display text-3xl font-normal mb-3">Nenhuma foto ainda</p>
          <p className="text-muted text-sm mb-8">Comece restaurando sua primeira memória.</p>
          <Link
            href="/dashboard/upload"
            className="inline-flex items-center justify-center gap-2 bg-ink text-white text-sm font-medium px-6 py-3 rounded-xl hover:bg-accent hover:-translate-y-0.5 transition-all shadow-lg shadow-ink/10 w-full sm:w-auto"
          >
            <Plus size={16} /> Restaurar primeira foto
          </Link>
        </div>
      )}
    </main>
  )
}
