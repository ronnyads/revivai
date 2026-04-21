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
            className={`flex items-center gap-3 px-6 py-4 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] transition-all duration-500 group relative ${
              isActive 
                ? 'bg-[#7C0DF2]/10 text-white border border-[#7C0DF2]/20' 
                : 'text-white/30 hover:bg-white/5 hover:text-white'
            }`}
          >
            {isActive && (
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#7C0DF2] rounded-r-full shadow-[0_0_15px_rgba(124,13,242,0.5)] z-20" />
            )}
            <Icon 
              size={16} 
              className={`transition-all duration-700 ${isActive ? 'text-[#7C0DF2] scale-110' : 'group-hover:text-[#7C0DF2] group-hover:scale-110'}`} 
            />
            <span className="font-display">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
