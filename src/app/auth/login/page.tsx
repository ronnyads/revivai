'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'

const FREE_PLAN_URL = 'https://pay.kirvano.com/8be0d9b0-c20d-471e-9988-0c5b1951c3b1'

function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const getSupabase = async () => {
    const { createClient } = await import('@/lib/supabase/client')
    return createClient()
  }

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = await getSupabase()
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); setLoading(false); return }
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
    const isAdmin = adminEmail && data?.user?.email === adminEmail
    window.location.href = isAdmin ? '/admin' : next
    setLoading(false)
  }

  const handleGoogle = async () => {
    const supabase = await getSupabase()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` }
    })
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-ink text-white flex-col justify-between p-14 relative overflow-hidden">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-accent opacity-[0.07] -bottom-32 -left-20" />
        <Link href="/" className="font-display text-2xl font-semibold relative">
          reviv<span className="text-accent">.</span>ai
        </Link>
        <div className="relative">
          <h2 className="font-display text-5xl font-normal italic leading-tight mb-4">
            "Trouxe de volta memórias que eu achei perdidas para sempre."
          </h2>
          <p className="text-white/50 text-sm">— Maria Aparecida, cliente desde 2024</p>
        </div>
        <p className="text-white/30 text-xs relative">Restauração de fotos com IA · reviv.ai</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-8 py-16">
        <div className="w-full max-w-md">
          <Link href="/" className="font-display text-xl font-semibold lg:hidden block mb-10">
            reviv<span className="text-accent">.</span>ai
          </Link>

          <h1 className="font-display text-4xl font-normal tracking-tight mb-2">Entrar</h1>
          <p className="text-muted text-sm mb-8">Acesse suas restaurações.</p>

          {/* Tabs */}
          <div className="flex gap-1 bg-surface rounded-lg p-1 mb-8">
            <div className="flex-1 py-2 rounded-md text-xs font-medium text-center bg-white text-ink shadow-sm">
              Senha
            </div>
            <a
              href={FREE_PLAN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 rounded-md text-xs font-medium text-center text-muted hover:text-ink transition-all"
            >
              Criar conta
            </a>
          </div>

          <form onSubmit={handlePassword} className="flex flex-col gap-4 mb-6">
            <div>
              <label className="text-xs font-medium text-muted mb-1.5 block uppercase tracking-wide">E-mail</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted mb-1.5 block uppercase tracking-wide">Senha</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} required value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-accent transition-colors pr-11"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button type="submit" disabled={loading}
              className="bg-ink text-white py-3 rounded-lg text-sm font-medium hover:bg-accent transition-colors disabled:opacity-60">
              {loading ? 'Aguarde...' : 'Entrar →'}
            </button>
          </form>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-[#E8E8E8]" /><span className="text-xs text-muted">ou</span><div className="flex-1 h-px bg-[#E8E8E8]" />
          </div>

          <button onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 border border-[#E8E8E8] py-3 rounded-lg text-sm font-medium hover:border-accent hover:text-accent transition-colors">
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9L37.4 10C33.8 6.8 29.1 5 24 5 12.9 5 4 13.9 4 25s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.7-.4-5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.8 1.1 8 2.9L37.4 10C33.8 6.8 29.1 5 24 5 16.3 5 9.6 9 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 45c5 0 9.6-1.7 13.2-4.6L30.8 35C28.8 36.3 26.5 37 24 37c-5.2 0-9.6-3-11.5-7.4l-6.6 5C9.5 40.8 16.3 45 24 45z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-1 2.7-2.8 4.9-5.1 6.4l6.4 5C40.5 36 44 31 44 25c0-1.3-.1-2.7-.4-5z"/>
            </svg>
            Continuar com Google
          </button>

          <p className="text-xs text-muted text-center mt-8">
            Ao entrar, você concorda com os{' '}
            <a href="/termos" className="text-accent hover:underline">Termos de Uso</a>.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
