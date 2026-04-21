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
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ${
        scrolled ? 'bg-black/60 backdrop-blur-[40px] py-4 shadow-[0_4px_30px_rgba(0,0,0,0.4)]' : 'bg-transparent py-10'
      } border-b border-white/[0.03] px-8 md:px-20`}
    >
      <div className="max-w-[1400px] mx-auto flex justify-between items-center w-full">
        <Link
          href="/"
          className="font-display font-bold text-2xl tracking-[-0.05em] flex items-center gap-1 italic"
          style={{ color: '#fff' }}
        >
          REVIV<span className="text-[#7C0DF2]">.AI</span>
        </Link>

        <ul className="hidden lg:flex gap-16 list-none m-0 p-0 items-center">
          {[
            ['#como-funciona', 'Recursos'],
            ['/dashboard/studio', 'Studio'],
            ['#pricing', 'Preços'],
            ['#faq', 'Support'],
          ].map(([href, label]) => (
            <li key={label}>
              <Link
                href={href}
                className="text-[10px] font-bold uppercase tracking-[0.4em] transition-all duration-500 hover:text-[#7C0DF2] text-white/40"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-10">
          {user ? (
            <Link
              href="/dashboard"
              className="group text-[10px] font-bold uppercase tracking-[0.3em] flex items-center gap-3 text-white/60 hover:text-white transition-all"
            >
              DASHBOARD <ArrowRight size={14} className="group-hover:translate-x-3 transition-transform text-[#7C0DF2] duration-500" />
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-[10px] font-bold uppercase tracking-[0.4em] transition-all duration-500 text-white/40 hover:text-white"
              >
                LOG IN
              </Link>
              <Link
                href="/#pricing"
                className="px-10 py-3.5 rounded-full bg-[#7C0DF2] text-white text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-white hover:text-[#131313] transition-all duration-700 shadow-[0_0_40px_rgba(124,13,242,0.15)]"
              >
                START NOW
              </Link>
            </>
          )}
        </div>

        <button className="lg:hidden text-white" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Editorial */}
      <div
        className={`fixed inset-0 top-0 bg-[#131315] z-50 p-12 flex flex-col gap-12 lg:hidden transition-transform duration-700 ease-in-out ${
          menuOpen ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex justify-between items-center mb-10">
           <div className="text-2xl font-bold font-display italic">REVIV<span className="text-[#7C0DF2]">.AI</span></div>
           <button onClick={() => setMenuOpen(false)}><X size={32} /></button>
        </div>

        <div className="flex flex-col gap-8">
           {[
             ['#como-funciona', 'Recursos'],
             ['/dashboard/studio', 'Studio'],
             ['#pricing', 'Preços'],
             ['#faq', 'Support'],
           ].map(([href, label]) => (
             <Link
               key={label}
               href={href}
               className="text-5xl font-bold font-display uppercase tracking-tight text-white/20 hover:text-[#7C0DF2] transition-colors"
               onClick={() => setMenuOpen(false)}
             >
               {label}
             </Link>
           ))}
        </div>
        
        <div className="mt-auto flex flex-col gap-6">
           <Link href="/auth/login" className="text-lg font-bold uppercase tracking-[0.3em] text-white/40" onClick={() => setMenuOpen(false)}>LOG IN</Link>
           <Link
              href="/#pricing"
              className="w-full py-6 rounded-full bg-[#7C0DF2] text-white text-center font-bold uppercase tracking-[0.3em] shadow-[0_0_40px_rgba(124,13,242,0.2)]"
              onClick={() => setMenuOpen(false)}
           >
              GET STARTED
           </Link>
        </div>
      </div>
    </nav>
  )
}
