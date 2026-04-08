'use client'
import { LogOut } from 'lucide-react'

export default function LogoutButton() {
  const handleLogout = async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/30 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/[0.08] group"
    >
      <LogOut size={13} className="group-hover:text-red-400" />
      Sair da conta
    </button>
  )
}
