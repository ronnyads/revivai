export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/dashboard/LogoutButton'
import { Image as ImageIcon, Sparkles, CreditCard, Megaphone } from 'lucide-react'
import CreditBadge from '@/components/ui/CreditBadge'
import MobileSidebar from '@/components/dashboard/MobileSidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row">
      
      {/* ── Sidebar (PC) ── */}
      <aside className="hidden md:flex w-64 bg-white border-r border-[#E8E8E8] flex-shrink-0 flex-col z-40 sticky top-0 h-screen">
        
        {/* Logo & Credits */}
        <div className="p-8 flex flex-col items-start gap-6 border-b border-[#E8E8E8]">
          <Link href="/dashboard" className="font-display text-2xl font-semibold hover:opacity-80 transition-opacity">
            reviv<span className="text-accent">.</span>ai
          </Link>
          <CreditBadge credits={profile?.credits ?? 0} plan={profile?.plan ?? 'free'} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted hover:text-ink hover:bg-surface transition-all group shrink-0">
            <ImageIcon size={18} className="group-hover:text-accent transition-colors" />
            Minhas fotos
          </Link>
          <Link href="/dashboard/upload" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-ink text-white hover:bg-accent transition-all shrink-0 shadow-lg shadow-ink/10">
            <Sparkles size={18} />
            Nova restauração
          </Link>
          <Link href="/dashboard/studio" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted hover:text-ink hover:bg-surface transition-all group shrink-0">
            <Megaphone size={18} className="group-hover:text-accent transition-colors" />
            Ad Studio
            <span className="ml-auto text-[10px] bg-accent text-white px-2 py-0.5 rounded-full leading-none">Novo</span>
          </Link>
          <div className="flex-1" />
          <Link href="/dashboard/billing" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted hover:text-ink hover:bg-surface transition-all">
            <CreditCard size={18} /> Planos e Créditos
          </Link>
        </nav>

        {/* User Footer */}
        <div className="p-6 border-t border-[#E8E8E8] flex flex-col gap-4">
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
        <MobileSidebar userEmail={user.email!}>
           <CreditBadge credits={profile?.credits ?? 0} plan={profile?.plan ?? 'free'} />
        </MobileSidebar>
        {children}
      </main>

    </div>
  )
}
