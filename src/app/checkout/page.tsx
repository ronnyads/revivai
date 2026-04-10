'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Check, ShieldCheck, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const PLANS = {
  perPhoto: {
    name: 'Restauração Avulsa',
    description: '1 foto restaurada com IA em alta resolução',
    price: 19.00,
    period: 'por foto',
    features: ['1 foto restaurada', 'Download em alta resolução', '4 modelos de IA', 'Resultado em segundos'],
  },
  subscription: {
    name: 'Assinatura Mensal',
    description: '10 fotos por mês + histórico + download 4K',
    price: 59.00,
    period: 'por mês',
    features: ['10 fotos por mês', 'Histórico completo', 'Download em 4K', 'Prioridade no processamento', 'Suporte prioritário'],
  },
  package: {
    name: 'Pacote 10 Créditos',
    description: '10 créditos sem expiração, use quando quiser',
    price: 129.00,
    period: '10 créditos',
    features: ['10 créditos permanentes', 'Use quando quiser', 'Download em alta resolução', 'Histórico salvo'],
  },
} as const

type PlanType = keyof typeof PLANS

function CheckoutForm() {
  const searchParams = useSearchParams()
  const planId = (searchParams.get('plan') as PlanType) || 'perPhoto'
  const plan = PLANS[planId]

  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [guestEmail, setGuestEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email)
    })
  }, [])

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const email = userEmail || guestEmail
    if (!userEmail && !guestEmail) {
      setError('Digite seu e-mail para continuar.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, email: userEmail ? undefined : guestEmail }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Erro ao iniciar pagamento')
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Plano inválido. <a href="/#pricing" className="text-accent">Ver planos</a></p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-white border-b border-[#E8E8E8] px-6 py-4">
        <a href="/" className="font-display text-xl font-normal tracking-tight">
          reviv<span className="text-accent">.</span>ai
        </a>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-[1fr_1.2fr] gap-10 items-start">

          {/* Resumo do pedido */}
          <div className="bg-white rounded-2xl border border-[#E8E8E8] p-8">
            <p className="text-xs font-medium tracking-widest uppercase text-muted mb-6">Resumo do pedido</p>

            <div className="mb-6">
              <h2 className="font-display text-3xl font-normal tracking-tight mb-1">{plan.name}</h2>
              <p className="text-sm text-muted">{plan.description}</p>
            </div>

            <div className="border-t border-[#E8E8E8] pt-6 mb-6">
              <ul className="flex flex-col gap-3">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <span className="w-4 h-4 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0">
                      <Check size={10} className="text-accent" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-[#E8E8E8] pt-6">
              <div className="flex items-end justify-between">
                <span className="text-sm text-muted">Total</span>
                <div className="text-right">
                  <span className="font-display text-4xl font-normal tracking-tight">
                    R${plan.price.toFixed(2).replace('.', ',')}
                  </span>
                  <p className="text-xs text-muted">{plan.period}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[#E8E8E8] flex items-center gap-2 text-xs text-muted">
              <ShieldCheck size={14} className="text-accent flex-shrink-0" />
              Pagamento seguro processado pelo Mercado Pago
            </div>
          </div>

          {/* Formulário */}
          <div className="bg-white rounded-2xl border border-[#E8E8E8] p-8">
            <p className="text-xs font-medium tracking-widest uppercase text-muted mb-6">Dados para acesso</p>

            <form onSubmit={handlePay} className="flex flex-col gap-5">
              {userEmail ? (
                <div className="bg-surface rounded-xl px-4 py-3 text-sm text-muted flex items-center gap-2">
                  <Check size={14} className="text-accent flex-shrink-0" />
                  Logado como <strong className="text-ink">{userEmail}</strong>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-muted mb-1.5 block uppercase tracking-wide">
                    Seu e-mail
                  </label>
                  <input
                    type="email"
                    required
                    value={guestEmail}
                    onChange={e => setGuestEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full px-4 py-3 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-accent transition-colors"
                  />
                  <p className="text-xs text-muted mt-1.5">
                    Usaremos este e-mail para criar seu acesso após o pagamento.
                  </p>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                style={{ backgroundColor: '#009ee3' }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Aguarde...
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                      <path d="M27.5 8.5H4.5C3.4 8.5 2.5 9.4 2.5 10.5v11c0 1.1.9 2 2 2h23c1.1 0 2-.9 2-2v-11c0-1.1-.9-2-2-2z" fill="white" fillOpacity=".2"/>
                      <path d="M12 19.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5c.9 0 1.72.34 2.33.9L16 12H12c-2.21 0-4 1.79-4 4s1.79 4 4 4h4l-1.67-1.4c-.61.56-1.43.9-2.33.9z" fill="white"/>
                    </svg>
                    Pagar com Mercado Pago
                  </>
                )}
              </button>

              <p className="text-xs text-center text-muted">
                Você será redirecionado para o ambiente seguro do Mercado Pago.
                <br />PIX, cartão de crédito ou boleto.
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutForm />
    </Suspense>
  )
}
