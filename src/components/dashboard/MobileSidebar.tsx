'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Camera, CreditCard, Image as ImageIcon, Menu, UserRound, Wand2, X } from 'lucide-react'
import DashboardNav from './DashboardNav'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import LogoutButton from '@/components/dashboard/LogoutButton'

const MOBILE_NAV_ITEMS = [
  { href: '/dashboard', label: 'Painel', icon: ImageIcon },
  { href: '/dashboard/upload', label: 'Criar', icon: Wand2 },
  { href: '/dashboard/studio', label: 'Studio', icon: Camera },
  { href: '/dashboard/prompts', label: 'Prompts', icon: BookOpen },
  { href: '/dashboard/profile', label: 'Perfil', icon: UserRound },
  { href: '/dashboard/billing', label: 'Planos', icon: CreditCard },
] as const

export default function MobileSidebar({
  userPlan = 'Explorador',
  userCredits = 0,
}: {
  userPlan?: string
  userCredits?: number
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const creditRatio = Math.max(6, Math.min(100, userCredits > 0 ? Math.round((userCredits / Math.max(userCredits, 200)) * 100) : 6))

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/6 bg-[#050505]/88 px-4 py-4 backdrop-blur-xl lg:hidden">
        <div>
          <h1 className="font-display text-xl font-bold text-[#54D6F6]">STUDIO LAB</h1>
          <p className="font-label mt-1 text-[10px] text-white/28">Terminal de criação</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-right">
            <p className="font-label text-[9px] uppercase tracking-[0.2em] text-[#54D6F6]">{userPlan}</p>
            <p className="font-label mt-1 text-[10px] text-white/70">{userCredits} CR</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70 transition-colors hover:text-white"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-6 rounded-[24px] border border-white/10 bg-[#050505]/92 p-2 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:hidden">
        {MOBILE_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

          return (
            <Link
              key={href}
              href={href}
              className={`flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[18px] px-1 transition-colors ${
                isActive ? 'bg-[#0C171A] text-[#54D6F6]' : 'text-white/42 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span className="font-label max-w-full truncate text-[9px] uppercase tracking-[0.12em]">{label}</span>
            </Link>
          )
        })}
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/72 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col border-r border-white/6 bg-[#050505]">
            <div className="flex items-center justify-between border-b border-white/6 px-5 py-5">
              <div>
                <h2 className="font-display text-xl font-bold text-[#54D6F6]">STUDIO LAB</h2>
                <p className="font-label mt-1 text-[10px] text-white/28">Terminal de criação</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-white/70 transition-colors hover:text-white">
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <DashboardNav onNavigate={() => setOpen(false)} />
            </div>

            <div className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <LanguageSwitcher compact />
                <LogoutButton compact />
              </div>

              <div className="panel-card rounded-[22px] p-5">
                <p className="font-label text-[10px] text-[#54D6F6]">{userPlan}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-label text-[10px] text-white/32">Créditos</span>
                  <span className="font-label text-[12px] text-white/78">{userCredits} CR</span>
                </div>
                <div className="mt-4 h-[2px] overflow-hidden bg-white/6">
                  <div className="h-full bg-cyan-gradient" style={{ width: `${creditRatio}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
