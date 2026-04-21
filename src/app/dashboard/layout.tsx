export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/dashboard/LogoutButton'
import { Image as ImageIcon, Sparkles, CreditCard, Megaphone, Home } from 'lucide-react'
import CreditBadge from '@/components/ui/CreditBadge'
import MobileSidebar from '@/components/dashboard/MobileSidebar'
import { LanguageProvider } from '@/contexts/LanguageContext'
import DashboardNav from '@/components/dashboard/DashboardNav'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-black flex flex-col md:flex-row font-sans">
        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
          .font-sans { font-family: 'DM Sans', sans-serif; }
        `}} />

        {/* ── Sidebar Premium (PC) ── */}
        <aside className="hidden md:flex w-72 bg-zinc-950/50 backdrop-blur-xl border-r border-zinc-900 flex-shrink-0 flex-col z-40 sticky top-0 h-screen">

          {/* Logo */}
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

          {/* Credits */}
          <div className="px-6 mb-8">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5 hover:border-zinc-700 transition-all group">
              <CreditBadge credits={profile?.credits ?? 0} plan={profile?.plan ?? 'free'} />
            </div>
          </div>

          {/* Nav — Client Component com traduções */}
          <DashboardNav />

          {/* Profile Footer */}
          <div className="px-6 pt-5 pb-6 border-t border-zinc-900">
            <div className="flex items-center gap-3 min-w-0 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-sm shadow-lg flex-shrink-0">
                {user.email?.[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{user.email?.split('@')[0]}</p>
                <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <LanguageSwitcher />
              <LogoutButton />
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 w-full relative overflow-y-auto bg-black">
          <MobileSidebar userEmail={user.email!}>
            <CreditBadge credits={profile?.credits ?? 0} plan={profile?.plan ?? 'free'} />
          </MobileSidebar>
          <div className="relative">
            {children}
          </div>
        </main>
      </div>
    </LanguageProvider>
  )
}
