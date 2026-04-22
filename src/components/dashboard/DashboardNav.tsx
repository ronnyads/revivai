'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Image as ImageIcon, Wand2, Camera, CreditCard, BookOpen } from 'lucide-react'
import { useT } from '@/contexts/LanguageContext'

const NAV_ITEMS = [
  { href: '/dashboard', fallbackLabel: 'Painel', labelKey: 'nav_photos', icon: ImageIcon },
  { href: '/dashboard/upload', fallbackLabel: 'Restauracao', labelKey: 'nav_restore', icon: Wand2 },
  { href: '/dashboard/studio', fallbackLabel: 'Ad Studio', labelKey: 'nav_studio', icon: Camera },
  { href: '/dashboard/prompts', fallbackLabel: 'Prompts', labelKey: 'nav_prompts', icon: BookOpen },
  { href: '/dashboard/billing', fallbackLabel: 'Planos', labelKey: 'nav_billing', icon: CreditCard },
] as const

export default function DashboardNav({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname()
  const t = useT()

  return (
    <nav className="flex flex-col gap-2">
      {NAV_ITEMS.map(({ href, fallbackLabel, labelKey, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`)
        const translated = t(labelKey)
        const label = translated === labelKey ? fallbackLabel : translated

        return (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            className={`group relative flex items-center gap-4 rounded-2xl px-5 py-4 transition-all duration-300 ${
              isActive ? 'bg-white/6 text-[#54D6F6]' : 'text-white/40 hover:bg-white/4 hover:text-white'
            } ${
              collapsed ? 'justify-center px-0' : ''
            }`}
          >
            {isActive && <div className="absolute inset-y-3 left-0 w-[2px] bg-cyan-gradient" />}
            <Icon size={18} className={isActive ? 'text-[#54D6F6]' : 'text-white/35 transition-colors group-hover:text-[#54D6F6]'} />
            {!collapsed && <span className="font-display text-lg font-bold tracking-tight">{label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}
