'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Images, Wand2, CreditCard, Megaphone, Upload } from 'lucide-react'
import { useT } from '@/contexts/LanguageContext'

const NAV_ITEMS = [
  { href: '/dashboard',         icon: Images,    labelKey: 'nav_photos',   label: 'Galeria' },
  { href: '/dashboard/upload',  icon: Upload,    labelKey: 'nav_restore',  label: 'Nova restauração' },
  { href: '/dashboard/studio',  icon: Megaphone, labelKey: 'nav_studio',   label: 'Ad Studio', badge: 'PRO' },
  { href: '/dashboard/billing', icon: CreditCard,labelKey: 'nav_billing',  label: 'Planos' },
]

export default function DashboardNav() {
  const t = useT()
  const pathname = usePathname()

  return (
    <nav className="flex-1 px-4 py-4 flex flex-col gap-1 overflow-y-auto">
      {NAV_ITEMS.map(({ href, icon: Icon, labelKey, label, badge }) => {
        const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all group relative ${
              isActive
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            <Icon size={16} className={isActive ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-700'} />
            <span>{t(labelKey) ?? label}</span>
            {badge && (
              <span className={`ml-auto text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 ${
                isActive ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
              }`}>
                {badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
