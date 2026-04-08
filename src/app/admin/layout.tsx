export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@reviv.ai'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Admin Topbar */}
      <header className="border-b border-white/10 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-display text-xl font-semibold">
            reviv<span className="text-accent">.</span>ai
          </span>
          <span className="text-[10px] bg-accent/20 text-accent border border-accent/30 px-2.5 py-1 rounded-full font-semibold tracking-widest uppercase">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-6 text-xs text-white/40">
          {[
            ['/', 'Site'],
            ['/admin', 'Dashboard'],
            ['/admin/orders', 'Pedidos'],
            ['/admin/users', 'Usuários'],
            ['/admin/photos', 'Fotos'],
          ].map(([href, label]) => (
            <a key={href} href={href} className="hover:text-white transition-colors">{label}</a>
          ))}
        </div>
        <span className="text-xs text-white/30">{user.email}</span>
      </header>
      <main className="px-8 py-10">{children}</main>
    </div>
  )
}
