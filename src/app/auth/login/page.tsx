'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'

const FREE_PLAN_URL = 'https://pay.kirvano.com/8be0d9b0-c20d-471e-9988-0c5b1951c3b1'
const EDITORIAL_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCIr6qloK9q3MZFu_p2KnRu0t1_7-2CW1FaY-JuMXruNTuj6cT2Yh0DogAKMxSXR8fPD6z0-zbe8mbh11DdQEnHg-fsmOJ2cfXaNxdb0-niZYE9KszB9BpxqBHxQnozxyBQLqYTq5HospPtp5TJnz3l5_mgi8bIy1Ja3C-boTLzy2EpZ8mfw71f7-QqIHD05WfHQOzpUD-Il05JXSd1_EyUzqc3HGpZJk8HE620sUNgCoS2VoqNsi3Ku8OIhowU3ei8Q2zZKCb_QsRg'

function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const getSupabase = async () => {
    const { createClient } = await import('@/lib/supabase/client')
    return createClient()
  }

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = await getSupabase()
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
    const isAdmin = adminEmail && data?.user?.email === adminEmail
    window.location.href = isAdmin ? '/admin' : next
    setLoading(false)
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    setError('')

    try {
      const supabase = await getSupabase()
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
      })
    } catch (err) {
      setGoogleLoading(false)
      setError(err instanceof Error ? err.message : 'Nao foi possivel iniciar o login com Google.')
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0e0e0e] text-[#e5e2e1]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(84,214,246,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(0,173,204,0.08),transparent_26%)]" />
        <div className="absolute left-[14%] top-0 h-52 w-px bg-gradient-to-b from-[#54d6f6]/70 to-transparent" />
        <div className="absolute bottom-[8%] right-[10%] h-32 w-px bg-gradient-to-t from-[#54d6f6]/50 to-transparent" />
      </div>

      <div className="relative flex min-h-screen flex-col md:flex-row">
        <section className="relative hidden min-h-screen md:flex md:w-[54%] lg:w-[58%]">
          <img
            src={EDITORIAL_IMAGE}
            alt="Visual editorial futurista da RevivAI"
            className="absolute inset-0 h-full w-full object-cover grayscale brightness-[0.42] contrast-[1.15]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(14,14,14,0.12),rgba(14,14,14,0.18)_42%,rgba(14,14,14,0.94))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(84,214,246,0.16),transparent_22%)]" />

          <div className="relative z-10 flex h-full w-full flex-col justify-between p-10 lg:p-14">
            <Link href="/" className="flex items-center gap-3">
              <span className="font-display text-2xl font-bold tracking-[-0.08em] text-[#54d6f6]">
                REVIVAI
              </span>
              <span className="h-2 w-2 rounded-full bg-[#54d6f6] shadow-[0_0_18px_rgba(84,214,246,0.95)]" />
            </Link>

            <div className="max-w-lg">
              <p className="font-label text-[10px] tracking-[0.34em] text-[#54d6f6]/70">
                PROTOCOLO DE ACESSO
              </p>
              <div className="mt-4 h-px w-28 bg-[#54d6f6]/35" />
              <h2 className="mt-6 font-display text-4xl font-bold leading-none tracking-[-0.06em] text-white lg:text-6xl">
                REVIVAI:
                <span className="mt-2 block text-[#54d6f6]">O ECO DA OBSIDIANA.</span>
              </h2>
              <p className="mt-6 max-w-md text-sm leading-7 text-[#bcc9cd] lg:text-base">
                Entre no terminal criativo e continue suas restauracoes, campanhas e fluxos premium
                com a mesma identidade cinematografica do studio.
              </p>
            </div>

            <div className="flex items-center justify-between gap-6 text-[#bcc9cd]/60">
              <div className="flex items-center gap-5">
                <span className="font-label text-[9px] tracking-[0.28em]">ENCRYP: AES-256</span>
                <span className="font-label text-[9px] tracking-[0.28em]">NODE: DX-04</span>
              </div>
              <span className="font-label text-[9px] tracking-[0.28em]">© 2026 REVIVAI</span>
            </div>
          </div>
        </section>

        <section className="relative flex flex-1 items-center justify-center px-6 py-10 md:px-10 lg:px-20">
          <div className="absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(84,214,246,0.12),transparent_70%)] blur-2xl" />

          <div className="relative z-10 w-full max-w-[34rem] rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-7 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-9">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 md:hidden">
                <span className="font-display text-xl font-bold tracking-[-0.08em] text-[#54d6f6]">
                  REVIVAI
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#54d6f6]" />
              </Link>

              <div className="hidden rounded-full border border-[#54d6f6]/20 bg-[#54d6f6]/8 px-3 py-1.5 md:inline-flex">
                <span className="font-label text-[10px] tracking-[0.24em] text-[#54d6f6]">
                  LOGIN TERMINAL
                </span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/3 px-3 py-1.5 text-[#bcc9cd]">
                <ShieldCheck size={14} className="text-[#54d6f6]" />
                <span className="font-label text-[10px] tracking-[0.2em]">SEGURO</span>
              </div>
            </div>

            <div className="mt-10">
              <p className="font-label text-[10px] tracking-[0.26em] text-[#54d6f6]">BEM-VINDO AO FUTURO</p>
              <h1 className="mt-4 font-display text-4xl font-bold leading-none tracking-[-0.06em] text-white sm:text-5xl">
                ACESSE SEU ESTUDIO CRIATIVO REVIVAI.
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-[#869397] sm:text-base">
                Continue suas restauracoes, roteiros e campanhas em um shell premium com autenticacao
                direta e onboarding conectado ao checkout oficial.
              </p>
            </div>

            <form onSubmit={handlePassword} className="mt-10 space-y-8">
              <div className="space-y-7">
                <label className="group block">
                  <span className="font-label text-[10px] tracking-[0.22em] text-[#869397] transition-colors group-focus-within:text-[#54d6f6]">
                    EMAIL DE USUARIO
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@terminal.ai"
                    className="mt-3 h-12 w-full border-x-0 border-b border-t-0 border-[#3d494d]/60 bg-transparent px-0 text-base text-white placeholder:text-[#869397]/35 focus:border-[#54d6f6] focus:ring-0"
                  />
                </label>

                <label className="group block">
                  <span className="font-label text-[10px] tracking-[0.22em] text-[#869397] transition-colors group-focus-within:text-[#54d6f6]">
                    CHAVE DE ACESSO
                  </span>
                  <div className="relative mt-3">
                    <input
                      type={showPw ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="h-12 w-full border-x-0 border-b border-t-0 border-[#3d494d]/60 bg-transparent px-0 pr-11 text-base text-white placeholder:text-[#869397]/35 focus:border-[#54d6f6] focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute bottom-3 right-1 text-[#869397] transition-colors hover:text-[#54d6f6]"
                      aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              ) : null}

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#00adcc,#54d6f6)] font-display text-sm font-bold tracking-[0.18em] text-[#001f26] transition-all hover:scale-[1.01] hover:shadow-[0_18px_45px_rgba(84,214,246,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LockKeyhole size={16} />
                  {loading ? 'AUTENTICANDO...' : 'ENTRAR NO TERMINAL'}
                </button>

                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={loading || googleLoading}
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-white/[0.03] text-sm font-medium text-white transition-colors hover:border-[#54d6f6]/35 hover:bg-[#54d6f6]/6 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9L37.4 10C33.8 6.8 29.1 5 24 5 12.9 5 4 13.9 4 25s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.7-.4-5z" />
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.8 1.1 8 2.9L37.4 10C33.8 6.8 29.1 5 24 5 16.3 5 9.6 9 6.3 14.7z" />
                    <path fill="#4CAF50" d="M24 45c5 0 9.6-1.7 13.2-4.6L30.8 35C28.8 36.3 26.5 37 24 37c-5.2 0-9.6-3-11.5-7.4l-6.6 5C9.5 40.8 16.3 45 24 45z" />
                    <path fill="#1976D2" d="M43.6 20H24v8h11.3c-1 2.7-2.8 4.9-5.1 6.4l6.4 5C40.5 36 44 31 44 25c0-1.3-.1-2.7-.4-5z" />
                  </svg>
                  {googleLoading ? 'CONECTANDO...' : 'CONTINUAR COM GOOGLE'}
                </button>
              </div>
            </form>

            <div className="mt-8 flex items-center justify-between gap-4">
              <a
                href="#"
                className="font-label text-[10px] tracking-[0.18em] text-[#869397] transition-colors hover:text-white"
              >
                ESQUECEU A SENHA?
              </a>
              <span className="h-1 w-1 rounded-full bg-[#3d494d]" />
              <a
                href={FREE_PLAN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-label text-[10px] tracking-[0.18em] text-[#54d6f6] transition-colors hover:text-[#afecff]"
              >
                CRIAR CONTA
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/6 pt-6 text-[#869397]">
              <p className="font-label text-[9px] tracking-[0.22em]">TERMS / PRIVACY / SUPORTE</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 font-label text-[9px] tracking-[0.22em] text-[#54d6f6] transition-colors hover:text-[#afecff]"
              >
                VOLTAR AO SITE
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
