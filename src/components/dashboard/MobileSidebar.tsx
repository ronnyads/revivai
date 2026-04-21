'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Images, Upload, CreditCard, Megaphone } from 'lucide-react'
import LogoutButton from './LogoutButton'
import { useT } from '@/contexts/LanguageContext'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'

const NAV = [
  { href: '/dashboard',         icon: Images,     labelKey: 'nav_photos',  label: 'Galeria' },
  { href: '/dashboard/upload',  icon: Upload,     labelKey: 'nav_restore', label: 'Nova restauração' },
  { href: '/dashboard/studio',  icon: Megaphone,  labelKey: 'nav_studio',  label: 'Ad Studio', badge: 'PRO' },
  { href: '/dashboard/billing', icon: CreditCard, labelKey: 'nav_billing', label: 'Planos' },
]

export default function MobileSidebar({ userEmail, children }: { userEmail: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const t = useT()

  useEffect(() => { setIsOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  return (
    <>
      {/* ── Mobile Top Bar ── */}
      <div className="md:hidden sticky top-0 z-30 bg-white border-b border-neutral-100 px-6 py-4 flex justify-between items-center">
        <Link href="/dashboard" className="font-display font-bold text-lg tracking-tighter text-neutral-900">
          REVIV<span className="text-[#D4FF00] [text-shadow:0_0_12px_#D4FF00]">.</span>AI
        </Link>
        <div className="flex items-center gap-3">
          {children}
          <LanguageSwitcher compact />
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 text-neutral-600 hover:bg-neutral-50 border border-neutral-100 transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* ── Overlay ── */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── Drawer ── */}
      <div className={`fixed inset-y-0 right-0 w-[80vw] max-w-xs bg-white z-50 md:hidden transform transition-transform duration-300 ease-out flex flex-col border-l border-neutral-100 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-neutral-900 flex items-center justify-center font-bold text-white text-sm">
              {userEmail?.[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-neutral-900 truncate max-w-[120px]">{userEmail?.split('@')[0]}</p>
              <p className="text-[10px] text-neutral-400 truncate max-w-[120px]">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-neutral-400 hover:text-neutral-900 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-4 flex flex-col gap-1">
          {NAV.map(({ href, icon: Icon, labelKey, label, badge }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-all ${
                  active
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <Icon size={16} />
                {t(labelKey) ?? label}
                {badge && (
                  <span className={`ml-auto text-[8px] font-black uppercase px-1.5 py-0.5 ${
                    active ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-100">
          <LanguageSwitcher />
          <div className="mt-3">
            <LogoutButton />
          </div>
        </div>
      </div>
    </>
  )
}
