'use client'

import Link from 'next/link'
import { Image as ImageIcon, Sparkles, CreditCard, Megaphone } from 'lucide-react'
import { useT } from '@/contexts/LanguageContext'

export default function DashboardNav() {
  const t = useT()

  return (
    <nav className="flex-1 px-4 flex flex-col gap-1.5 overflow-y-auto">
      <p className="px-4 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-2 mt-4">{t('nav_section_nav')}</p>

      <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent transition-all group">
        <ImageIcon size={18} className="text-zinc-500 group-hover:text-indigo-400 transition-colors" />
        {t('nav_photos')}
      </Link>

      <Link href="/dashboard/upload" className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-[0_0_30px_-10px_#6366f1] hover:scale-[1.02] active:scale-95 transition-all mb-4">
        <Sparkles size={18} fill="currentColor" />
        {t('nav_restore')}
      </Link>

      <p className="px-4 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-2 mt-6">{t('nav_section_creation')}</p>

      <Link href="/dashboard/studio" className="relative flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium bg-zinc-900 text-white border border-zinc-800 shadow-xl overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <Megaphone size={18} className="text-indigo-400" />
        {t('nav_studio')}
        <span className="ml-auto text-[8px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-sm animate-pulse">PRO</span>
      </Link>

      <div className="flex-1" />

      <Link href="/dashboard/billing" className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all mb-2">
        <CreditCard size={18} /> {t('nav_billing')}
      </Link>
    </nav>
  )
}
