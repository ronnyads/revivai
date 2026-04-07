export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PhotoCard from '@/components/ui/PhotoCard'
import CreditBadge from '@/components/ui/CreditBadge'
import { Plus, LogOut } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: photos }] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('photos').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  const handleLogout = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-white border-b border-[#E8E8E8] px-8 py-5 flex items-center justify-between sticky top-0 z-40">
        <Link href="/" className="font-display text-xl font-semibold">
          reviv<span className="text-accent">.</span>ai
        </Link>
        <div className="flex items-center gap-4">
          <CreditBadge credits={profile?.credits ?? 0} plan={profile?.plan ?? 'free'} />
          <Link
            href="/dashboard/upload"
            className="flex items-center gap-2 bg-ink text-white text-sm font-medium px-5 py-2.5 rounded hover:bg-accent transition-colors"
          >
            <Plus size={14} /> Nova restauração
          </Link>
          <form action={handleLogout}>
            <button type="submit" className="p-2 text-muted hover:text-ink transition-colors rounded">
              <LogOut size={18} />
            </button>
          </form>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-8 py-12">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-normal tracking-tight mb-1">
            Olá, {user.email?.split('@')[0]} 👋
          </h1>
          <p className="text-muted text-sm">Aqui estão suas fotos restauradas.</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          {[
            { label: 'Total de fotos', value: photos?.length ?? 0 },
            { label: 'Concluídas', value: photos?.filter(p => p.status === 'done').length ?? 0 },
            { label: 'Créditos restantes', value: profile?.credits ?? 0 },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-[#E8E8E8] p-6">
              <div className="font-display text-4xl font-normal tracking-tight mb-1">{s.value}</div>
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
          <div className="bg-white border-2 border-dashed border-[#E8E8E8] rounded-2xl p-20 text-center">
            <p className="font-display text-3xl font-normal mb-3">Nenhuma foto ainda</p>
            <p className="text-muted text-sm mb-8">Comece restaurando sua primeira memória.</p>
            <Link
              href="/dashboard/upload"
              className="inline-flex items-center gap-2 bg-ink text-white text-sm font-medium px-6 py-3 rounded hover:bg-accent transition-colors"
            >
              <Plus size={14} /> Restaurar primeira foto
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
