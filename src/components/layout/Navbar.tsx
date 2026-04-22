'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import LogoutButton from '@/components/dashboard/LogoutButton'

const NAV_ITEMS = [
  ['#recursos', 'Portfólio'],
  ['#estrutura', 'Edições'],
  ['#pricing', 'Preços'],
  ['/dashboard/studio', 'Estúdio'],
] as const

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      createClient().auth.getUser().then(({ data }) => setUser(data.user))
    })
    const onScroll = () => setScrolled(window.scrollY > 18)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] border-b border-white/5 transition-all duration-500 ${
          scrolled ? 'bg-[#0E0E0E]/84 py-4 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]' : 'bg-[#0E0E0E]/55 py-5 backdrop-blur-xl'
        }`}
      >
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 md:px-8">
          <Link href="/" className="font-display text-2xl font-bold tracking-[-0.05em] text-white">
            RevivAI
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            {NAV_ITEMS.map(([href, label], index) => (
              <Link
                key={label}
                href={href}
                className={`font-label text-[11px] text-white/60 transition-colors duration-300 hover:text-[#54D6F6] ${
                  index === 0 ? 'border-b-2 border-[#00ADCC] pb-1 text-[#00ADCC]' : ''
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <LanguageSwitcher compact />
            {user && <LogoutButton compact />}
            <Link
              href={user ? '/dashboard/studio' : '/#pricing'}
              className="bg-cyan-gradient rounded-full px-5 py-2.5 font-label text-[11px] text-[#003641] shadow-[0_12px_30px_rgba(0,173,204,0.22)] transition-transform duration-300 hover:-translate-y-0.5"
            >
              {user ? 'Abrir Estúdio' : 'Criar Projeto'}
            </Link>
            <button
              type="button"
              aria-label="Abrir menu"
              className="text-white transition-colors hover:text-[#54D6F6] lg:hidden"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
          </div>

          <button
            type="button"
            aria-label="Abrir menu"
            className="text-white transition-colors hover:text-[#54D6F6] md:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} />
          </button>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-[120] bg-[#0E0E0E]/96 px-8 py-8 transition-transform duration-500 md:hidden ${
          menuOpen ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="mb-16 flex items-center justify-between">
          <span className="font-display text-2xl font-bold text-white">RevivAI</span>
          <button
            type="button"
            aria-label="Fechar menu"
            className="text-white transition-colors hover:text-[#54D6F6]"
            onClick={() => setMenuOpen(false)}
          >
            <X size={28} />
          </button>
        </div>

        <div className="flex flex-col gap-8">
          {NAV_ITEMS.map(([href, label]) => (
            <Link
              key={label}
              href={href}
              className="font-display text-4xl font-bold uppercase tracking-tight text-white/85 transition-colors hover:text-[#54D6F6]"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="mt-auto pt-16">
          <div className="mb-5 flex items-center gap-3">
            <LanguageSwitcher compact />
            {user && <LogoutButton compact />}
          </div>
          <Link
            href={user ? '/dashboard/studio' : '/#pricing'}
            className="bg-cyan-gradient block rounded-full px-6 py-4 text-center font-label text-xs text-[#003641]"
            onClick={() => setMenuOpen(false)}
          >
            {user ? 'Abrir Estúdio' : 'Criar Projeto'}
          </Link>
        </div>
      </div>
    </>
  )
}
