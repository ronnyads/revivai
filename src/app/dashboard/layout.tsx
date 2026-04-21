export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/dashboard/LogoutButton'
import { Images, Wand2, CreditCard, Megaphone, ChevronRight } from 'lucide-react'
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
      <div className="min-h-screen bg-[#F8F6F1] flex flex-col md:flex-row font-sans">
        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700&display=swap');
          .font-display { font-family: 'Space Grotesk', sans-serif; }
          .font-sans { font-family: 'Manrope', sans-serif; }
        `}} />

        {/* ── Sidebar Light (PC) ── */}
        <aside className="hidden md:flex w-64 bg-white border-r border-neutral-100 flex-shrink-0 flex-col z-40 sticky top-0 h-screen">

          {/* Logo */}
          <div className="px-8 py-8 border-b border-neutral-100">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="font-display font-bold text-xl tracking-tighter text-neutral-900">
                REVIV<span className="text-[#D4FF00] [text-shadow:0_0_20px_#D4FF00]">.</span>AI
              </span>
            </Link>
          </div>

          {/* Credits */}
          <div className="px-6 py-6 border-b border-neutral-100">
            <div className="bg-neutral-50 p-4 border border-neutral-100">
              <CreditBadge credits={profile?.credits ?? 0} plan={profile?.plan ?? 'free'} />
            </div>
          </div>

          {/* Nav */}
          <DashboardNav />

          {/* Profile Footer */}
          <div className="px-6 py-6 border-t border-neutral-100 mt-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-neutral-900 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
                {user.email?.[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-neutral-900 truncate">{user.email?.split('@')[0]}</p>
                <p className="text-[10px] text-neutral-400 truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <LanguageSwitcher />
              <LogoutButton />
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 w-full relative overflow-y-auto bg-[#F8F6F1]">
          <MobileSidebar userEmail={user.email!}>
            <CreditBadge credits={profile?.credits ?? 0} plan={profile?.plan ?? 'free'} />
          </MobileSidebar>
          {children}
        </main>
      </div>
    </LanguageProvider>
  )
}
