'use client'
import { LogOut } from 'lucide-react'
import { useT } from '@/contexts/LanguageContext'

export default function LogoutButton({ compact = false }: { compact?: boolean }) {
  const t = useT()

  const handleLogout = async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <button
      onClick={handleLogout}
      className={`flex items-center justify-center gap-2 rounded-full border transition-all ${
        compact
          ? 'border-white/8 bg-white/[0.03] px-3 py-2 font-label text-[10px] text-white/58 hover:border-red-400/40 hover:bg-red-500/12 hover:text-red-200'
          : 'w-full px-4 py-3 font-label text-[10px] uppercase tracking-[0.2em] text-white/58 border-white/8 bg-white/[0.03] hover:border-red-400/40 hover:bg-red-500/12 hover:text-red-200'
      }`}
    >
      <LogOut size={compact ? 14 : 16} />
      {!compact && t('nav_logout')}
    </button>
  )
}
