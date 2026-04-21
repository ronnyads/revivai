'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu, X, ArrowRight } from 'lucide-react'

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
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 md:px-20 py-6 transition-all duration-500"
      style={{
        backgroundColor: scrolled ? 'rgba(19,19,21,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
      }}
    >
      <Link
        href="/"
        className="font-display font-bold text-2xl tracking-tighter uppercase flex items-center gap-1"
        style={{ color: '#fff' }}
      >
        REVIV<span className="text-[#D4FF00]">.</span>AI
      </Link>

      <ul className="hidden lg:flex gap-12 list-none m-0 p-0">
        {[
          ['#como-funciona', 'Recursos'],
          ['/dashboard/studio', 'Studio'],
          ['#pricing', 'Assinaturas'],
          ['#faq', 'Suporte'],
        ].map(([href, label]) => (
          <li key={href}>
            <a
              href={href}
              className="text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 hover:text-[#D4FF00]"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>

      <div className="hidden md:flex items-center gap-8">
        {user ? (
          <Link
            href="/dashboard"
            className="group text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-white"
          >
            MEU DASHBOARD <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform text-[#D4FF00]" />
          </Link>
        ) : (
          <>
            <Link
              href="/auth/login"
              className="text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 hover:text-white"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              Entrar
            </Link>
            <Link
              href="/#pricing"
              className="px-8 py-3 rounded-full bg-[#D4FF00] text-[#131315] text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white transition-all duration-300 shadow-[0_0_20px_rgba(212,255,0,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            >
              COMEÇAR AGORA
            </Link>
          </>
        )}
      </div>

      <button className="lg:hidden" onClick={() => setMenuOpen(!menuOpen)} style={{ color: '#fff' }}>
        {menuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 top-[88px] bg-[#131315] z-40 p-10 flex flex-col gap-8 lg:hidden animate-fade-in"
        >
          {[
            ['#como-funciona', 'Recursos'],
            ['/dashboard/studio', 'Studio'],
            ['#pricing', 'Assinaturas'],
            ['#faq', 'Suporte'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="text-4xl font-bold font-display uppercase tracking-tight"
              style={{ color: '#fff' }}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </a>
          ))}
          <div className="mt-auto flex flex-col gap-4">
             <Link href="/auth/login" className="text-xl font-medium text-white/50" onClick={() => setMenuOpen(false)}>Entrar</Link>
             <Link
                href="/#pricing"
                className="w-full py-5 rounded-full bg-[#D4FF00] text-[#131315] text-center font-bold uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(212,255,0,0.1)] active:scale-95 transition-transform"
                onClick={() => setMenuOpen(false)}
             >
                COMEÇAR AGORA
             </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
