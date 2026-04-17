export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/dashboard/LogoutButton'
import { Image as ImageIcon, Sparkles, CreditCard, Megaphone, Home } from 'lucide-react'
import CreditBadge from '@/components/ui/CreditBadge'
import MobileSidebar from '@/components/dashboard/MobileSidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()

  return (
    <div className="min-h-screen bg-black flex flex-col md:flex-row font-sans">
       <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        .font-sans { font-family: 'DM Sans', sans-serif; }
      `}} />
      
      {/* ── Sidebar Premium (PC) ── */}
      <aside className="hidden md:flex w-72 bg-zinc-950/50 backdrop-blur-xl border-r border-zinc-900 flex-shrink-0 flex-col z-40 sticky top-0 h-screen">
        
        {/* Logo Section */}
        <div className="p-8 pb-10">
          <Link href="/dashboard" className="group flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-[0_0_20px_-5px_#6366f1]">
              <span className="text-white font-black text-xl">R</span>
            </div>
            <span className="font-bold text-2xl tracking-tight text-white group-hover:text-indigo-400 transition-colors">
              reviv<span className="text-indigo-500">.</span>ai
            </span>
          </Link>
        </div>

        {/* Global Credits Display */}
        <div className="px-6 mb-8">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5 hover:border-zinc-700 transition-all group">
             <CreditBadge credits={profile?.credits ?? 0} plan={profile?.plan ?? 'free'} />
          </div>
        </div>

        {/* Vertical Navigation */}
        <nav className="flex-1 px-4 flex flex-col gap-1.5 overflow-y-auto">
          <p className="px-4 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-2 mt-4">Navegação</p>
          
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent transition-all group">
            <ImageIcon size={18} className="text-zinc-500 group-hover:text-indigo-400 transition-colors" />
            Minhas fotos
          </Link>
          
          <Link href="/dashboard/upload" className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-[0_0_30px_-10px_#6366f1] hover:scale-[1.02] active:scale-95 transition-all mb-4">
            <Sparkles size={18} fill="currentColor" />
            Nova restauração
          </Link>

          <p className="px-4 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-2 mt-6">Criação</p>
          
          <Link href="/dashboard/studio" className="relative flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium bg-zinc-900 text-white border border-zinc-800 shadow-xl overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Megaphone size={18} className="text-indigo-400" />
            Ad Studio
            <span className="ml-auto text-[8px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-sm animate-pulse">PRO</span>
          </Link>

          <div className="flex-1" />
          
          <Link href="/dashboard/billing" className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all mb-2">
            <CreditCard size={18} /> Planos e Créditos
          </Link>
        </nav>

        {/* Premium Profile Footer */}
        <div className="p-6 border-t border-zinc-900 bg-zinc-950/80">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white shadow-lg">
                {user.email?.[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{user.email?.split('@')[0]}</p>
                <p className="text-[10px] text-zinc-500 truncate font-medium">{user.email}</p>
              </div>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 w-full relative overflow-y-auto bg-black">
        <MobileSidebar userEmail={user.email!}>
           <CreditBadge credits={profile?.credits ?? 0} plan={profile?.plan ?? 'free'} />
        </MobileSidebar>
        <div className="relative">
          {children}
        </div>
      </main>

    </div>
  )
}
