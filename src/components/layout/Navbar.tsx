'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Lazy-load Supabase to avoid SSR prerender issues
    import('@/lib/supabase/client').then(({ createClient }) => {
      createClient().auth.getUser().then(({ data }) => setUser(data.user))
    })
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 md:px-12 py-5 bg-white/90 backdrop-blur-md border-b border-[#E8E8E8] transition-shadow duration-300 ${scrolled ? 'shadow-[0_4px_24px_rgba(0,0,0,0.06)]' : ''}`}>
      <Link href="/" className="font-display text-xl font-semibold tracking-tight">
        reviv<span className="text-accent">.</span>ai
      </Link>

      <ul className="hidden md:flex gap-9 list-none">
        {[['#como-funciona','Como funciona'],['#modelos','Tecnologia'],['#pricing','Preços'],['#depoimentos','Depoimentos']].map(([href, label]) => (
          <li key={href}><a href={href} className="text-sm text-muted hover:text-ink transition-colors duration-200">{label}</a></li>
        ))}
      </ul>

      <div className="hidden md:flex items-center gap-3">
        {user ? (
          <Link href="/dashboard" className="bg-ink text-white text-sm font-medium px-6 py-2.5 rounded border-[1.5px] border-ink hover:bg-accent hover:border-accent transition-all duration-200">
            Dashboard →
          </Link>
        ) : (
          <>
            <Link href="/auth/login" className="text-sm text-muted hover:text-ink transition-colors">Entrar</Link>
            <Link href="#pricing" className="bg-ink text-white text-sm font-medium px-6 py-2.5 rounded border-[1.5px] border-ink hover:bg-accent hover:border-accent transition-all duration-200">
              Começar grátis →
            </Link>
          </>
        )}
      </div>

      <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-[#E8E8E8] p-6 flex flex-col gap-4 md:hidden shadow-lg">
          {[['#como-funciona','Como funciona'],['#modelos','Tecnologia'],['#pricing','Preços'],['#depoimentos','Depoimentos']].map(([href, label]) => (
            <a key={href} href={href} className="text-sm text-muted" onClick={() => setMenuOpen(false)}>{label}</a>
          ))}
          <Link href="/auth/login" className="text-sm font-medium text-ink">Entrar</Link>
          <Link href="#pricing" className="bg-ink text-white text-sm text-center font-medium px-6 py-3 rounded">Começar grátis →</Link>
        </div>
      )}
    </nav>
  )
}
