'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Image as ImageIcon, Camera, Wand2, CreditCard } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Galeria', icon: ImageIcon },
  { href: '/dashboard/upload', label: 'Restauração', icon: Wand2 },
  { href: '/dashboard/studio', label: 'Ad Studio', icon: Camera },
  { href: '/dashboard/billing', label: 'Planos', icon: CreditCard },
]

export default function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-2">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all group relative ${
              isActive 
                ? 'bg-white/10 text-white' 
                : 'text-white/50 hover:bg-white/5 hover:text-white'
            }`}
          >
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#D4FF00] rounded-r-full shadow-[0_0_10px_#D4FF00]" />
            )}
            <Icon 
              size={18} 
              className={`transition-colors ${isActive ? 'text-[#D4FF00]' : 'group-hover:text-[#D4FF00]'}`} 
            />
            <span className="text-sm font-sans tracking-wide">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
