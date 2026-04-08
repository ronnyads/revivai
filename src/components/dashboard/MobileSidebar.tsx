'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Image as ImageIcon, Sparkles, CreditCard } from 'lucide-react'
import LogoutButton from './LogoutButton'

export default function MobileSidebar({ userEmail, children }: { userEmail: string, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar on route change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevent scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  return (
    <>
      {/* ── Top Nav for Mobile ── */}
      <div className="md:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md px-6 py-4 border-b border-[#E8E8E8] flex justify-between items-center shadow-sm">
        <Link href="/dashboard" className="font-display text-xl font-semibold">
          reviv<span className="text-accent">.</span>ai
        </Link>
        <div className="flex items-center gap-3">
          {children} {/* Pass CreditBadge here */}
          <button 
            onClick={() => setIsOpen(true)}
            className="p-1.5 text-ink hover:bg-surface rounded-md transition-colors"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* ── Auto-dismiss overlay ── */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── Premium Drawer ── */}
      <div className={`fixed inset-y-0 right-0 w-[85vw] max-w-sm bg-white shadow-2xl z-50 md:hidden transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-[#E8E8E8]">
           <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-light text-accent flex items-center justify-center font-bold text-sm">
              {userEmail?.[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink truncate max-w-[150px]">{userEmail?.split('@')[0]}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-muted hover:text-ink hover:bg-surface rounded-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
          <Link href="/dashboard" className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${pathname === '/dashboard' ? 'bg-surface text-ink' : 'text-muted hover:text-ink hover:bg-surface/50'}`}>
            <ImageIcon size={18} className={pathname === '/dashboard' ? 'text-accent' : ''} />
            Minhas fotos
          </Link>
          <Link href="/dashboard/upload" className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all mt-2 ${pathname === '/dashboard/upload' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-ink text-white hover:bg-accent'}`}>
            <Sparkles size={18} />
            Nova restauração
          </Link>
          <div className="my-3 border-b border-[#E8E8E8]" />
          <Link href="/dashboard/billing" className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${pathname === '/dashboard/billing' ? 'bg-surface text-ink' : 'text-muted hover:text-ink hover:bg-surface/50'}`}>
            <CreditCard size={18} /> 
            Planos e Créditos
          </Link>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#E8E8E8] bg-surface">
          <LogoutButton />
        </div>
      </div>
    </>
  )
}
