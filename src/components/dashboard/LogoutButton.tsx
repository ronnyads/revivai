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
      className={`flex items-center justify-center gap-2 text-sm font-medium transition-colors hover:text-red-500 rounded-lg ${
        compact 
          ? 'text-muted p-2 bg-surface hover:bg-red-50' 
          : 'w-full px-4 py-2 border border-[#E8E8E8] text-ink hover:border-red-200 hover:bg-red-50'
      }`}
    >
      <LogOut size={16} />
      {!compact && 'Sair da conta'}
    </button>
  )
}
