export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/admin/LogoutButton'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) redirect('/auth/login')

  const navItems = [
    { href: '/admin', icon: '◈', label: 'Dashboard' },
    { href: '/admin/orders', icon: '◎', label: 'Pedidos' },
    { href: '/admin/users', icon: '◉', label: 'Usuarios' },
    { href: '/admin/photos', icon: '◌', label: 'Fotos' },
    { href: '/admin/studio', icon: '🐛', label: 'Studio Debug' },
    { href: '/admin/prompts', icon: '✦', label: 'Modos de Restauracao' },
    { href: '/admin/studio-prompts', icon: '🎬', label: 'Prompts Studio IA' },
    { href: '/admin/prompt-gallery', icon: '📚', label: 'Galeria de Prompts' },
    { href: '/admin/plans', icon: '◆', label: 'Planos' },
    { href: '/admin/testimonials', icon: '❝', label: 'Depoimentos' },
    { href: '/admin/faqs', icon: '?', label: 'FAQ' },
    { href: '/admin/settings', icon: '⚙', label: 'Configuracoes' },
  ]

  return (
    <div className="min-h-screen flex bg-[#080808] text-white">
      <aside className="w-60 flex-shrink-0 border-r border-white/[0.06] flex flex-col">
        <div className="px-6 pt-8 pb-6 border-b border-white/[0.06]">
          <Link href="/" className="font-display text-2xl font-semibold">
            reviv<span className="text-[#7C0DF2]">.</span>ai
          </Link>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C0DF2] animate-pulse" />
            <span className="text-[10px] text-white/30 font-medium tracking-widest uppercase">Admin Panel</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 flex flex-col gap-1">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/[0.05] transition-all duration-150 group"
            >
              <span className="text-base text-white/20 group-hover:text-[#7C0DF2] transition-colors">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="px-4 py-5 border-t border-white/[0.06] flex flex-col gap-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.04] mb-2">
            <div className="w-7 h-7 rounded-full bg-[#7C0DF2]/20 flex items-center justify-center text-[#7C0DF2] text-xs font-bold flex-shrink-0">
              {user.email?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{user.email?.split('@')[0]}</p>
              <p className="text-[10px] text-white/30 truncate">{user.email}</p>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-xs text-white/30 hover:text-white transition-colors rounded-lg hover:bg-white/[0.04]"
          >
            <span>←</span> Ver site
          </Link>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="px-10 py-10">{children}</div>
      </main>
    </div>
  )
}
