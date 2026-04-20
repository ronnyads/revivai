'use client'
import { LogOut } from 'lucide-react'

export default function LogoutButton({ compact = false }: { compact?: boolean }) {
  const handleLogout = async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <button
      onClick={handleLogout}
      className={`flex items-center justify-center gap-2 text-sm font-medium transition-colors rounded-lg ${
        compact
          ? 'text-muted p-2 bg-surface hover:bg-red-50 hover:text-red-500'
          : 'w-full px-4 py-2 border border-zinc-800 text-zinc-400 hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/10'
      }`}
    >
      <LogOut size={16} />
      {!compact && 'Sair da conta'}
    </button>
  )
}
