'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      createClient().auth.getUser().then(({ data }) => setUser(data.user))
    })
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 md:px-12 py-5 transition-all duration-300"
      style={{
        backgroundColor: scrolled ? 'rgba(14,14,14,0.95)' : 'rgba(14,14,14,0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: scrolled ? '1px solid rgba(45,126,255,0.15)' : '1px solid transparent',
      }}
    >
      <Link
        href="/"
        style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: '1.25rem', color: '#e5e2e1' }}
      >
        reviv<span style={{ color: '#2D7EFF' }}>.</span>ai
      </Link>

      <ul className="hidden md:flex gap-9 list-none">
        {[
          ['#como-funciona', 'Como funciona'],
          ['/dashboard/studio', 'Studio'],
          ['#pricing', 'Preços'],
          ['#depoimentos', 'Depoimentos'],
        ].map(([href, label]) => (
          <li key={href}>
            <a
              href={href}
              className="text-sm transition-colors duration-200"
              style={{ color: 'rgba(229,226,225,0.6)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#2D7EFF')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(229,226,225,0.6)')}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>

      <div className="hidden md:flex items-center gap-4">
        {user ? (
          <Link
            href="/dashboard"
            className="text-sm font-medium px-6 py-2.5 transition-all duration-200"
            style={{ backgroundColor: '#2D7EFF', color: '#fff' }}
          >
            Dashboard →
          </Link>
        ) : (
          <>
            <Link
              href="/auth/login"
              className="text-sm transition-colors"
              style={{ color: 'rgba(229,226,225,0.6)' }}
            >
              Entrar
            </Link>
            <Link
              href="/#pricing"
              className="text-sm font-medium px-6 py-2.5 transition-all duration-200"
              style={{ backgroundColor: '#2D7EFF', color: '#fff' }}
            >
              Restaurar agora →
            </Link>
          </>
        )}
      </div>

      <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} style={{ color: '#e5e2e1' }}>
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {menuOpen && (
        <div
          className="absolute top-full left-0 right-0 p-6 flex flex-col gap-4 md:hidden"
          style={{ backgroundColor: '#0e0e0e', borderBottom: '1px solid rgba(45,126,255,0.15)' }}
        >
          {[
            ['#como-funciona', 'Como funciona'],
            ['#modelos', 'Tecnologia'],
            ['#pricing', 'Preços'],
            ['#depoimentos', 'Depoimentos'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="text-sm"
              style={{ color: 'rgba(229,226,225,0.6)' }}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </a>
          ))}
          <Link href="/auth/login" className="text-sm font-medium" style={{ color: '#e5e2e1' }}>Entrar</Link>
          <Link
            href="/#pricing"
            className="text-sm text-center font-medium px-6 py-3"
            style={{ backgroundColor: '#2D7EFF', color: '#fff' }}
          >
            Restaurar agora →
          </Link>
        </div>
      )}
    </nav>
  )
}
