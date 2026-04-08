import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/dashboard/LogoutButton'
import { Image as ImageIcon, Sparkles, User, CreditCard } from 'lucide-react'
import CreditBadge from '@/components/ui/CreditBadge'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row">
      
      {/* ── Sidebar (PC) / Top Nav (Mobile) ── */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-[#E8E8E8] flex-shrink-0 flex flex-col z-40 sticky top-0 md:h-screen">
        
        {/* Logo & Credits */}
        <div className="p-6 md:p-8 flex items-center justify-between md:flex-col md:items-start md:gap-6 border-b border-[#E8E8E8]">
          <Link href="/" className="font-display text-2xl font-semibold hover:opacity-80 transition-opacity">
            reviv<span className="text-accent">.</span>ai
          </Link>
          <div className="hidden md:block">
            <CreditBadge credits={profile?.credits ?? 0} plan={profile?.plan ?? 'free'} />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted hover:text-ink hover:bg-surface transition-all group shrink-0">
            <ImageIcon size={18} className="group-hover:text-accent transition-colors" />
            Minhas fotos
          </Link>
          <Link href="/dashboard/upload" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-ink text-white hover:bg-accent transition-all shrink-0 shadow-lg shadow-ink/10">
            <Sparkles size={18} />
            Nova restauração
          </Link>
          <div className="flex-1 hidden md:block" />
          <Link href="/#pricing" className="hidden md:flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted hover:text-ink hover:bg-surface transition-all">
            <CreditCard size={18} /> Planos e Créditos
          </Link>
        </nav>

        {/* User Footer (PC only) */}
        <div className="hidden md:flex p-6 border-t border-[#E8E8E8] flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-light text-accent flex items-center justify-center font-bold text-sm">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink truncate">{user.email?.split('@')[0]}</p>
              <p className="text-xs text-muted truncate">{user.email}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 w-full relative overflow-y-auto">
        <div className="md:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md px-6 py-3 border-b border-[#E8E8E8] flex justify-between items-center">
           <CreditBadge credits={profile?.credits ?? 0} plan={profile?.plan ?? 'free'} />
           <LogoutButton compact />
        </div>
        {children}
      </main>

    </div>
  )
}
