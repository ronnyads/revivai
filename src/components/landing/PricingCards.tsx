'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="8" cy="8" r="8" fill="#D94F2E" fillOpacity="0.15" />
    <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="#D94F2E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const PLANS = [
  {
    id: 'perPhoto',
    badge: null,
    name: 'Avulso',
    subtitle: 'Para usar quando precisar',
    period: 'por foto',
    features: [
      '1 foto restaurada',
      'Download em alta resolução',
      'Resultado em segundos',
      'PIX, cartão ou boleto',
    ],
    cta: 'Restaurar agora',
    featured: false,
  },
  {
    id: 'subscription',
    badge: 'Mais popular',
    name: 'Assinatura',
    subtitle: 'Para quem restaura com frequência',
    period: 'por mês',
    features: [
      '10 fotos por mês incluídas',
      'Fila prioritária de processamento',
      'Histórico completo salvo',
      'Download em 4K',
      'Suporte prioritário',
    ],
    cta: 'Assinar agora',
    featured: true,
  },
  {
    id: 'package',
    badge: 'Melhor custo-benefício',
    name: 'Pacote',
    subtitle: 'Créditos que não expiram',
    period: '10 créditos',
    features: [
      '10 créditos permanentes',
      'Use quando e como quiser',
      'Download em alta resolução',
      'Histórico salvo para sempre',
    ],
    cta: 'Restaurar agora',
    featured: false,
  },
]

type Prices = {
  perPhoto:     { price: number }
  subscription: { price: number }
  package:      { price: number }
}

export default function PricingCards({ prices }: { prices: Prices }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleCheckout = (planId: string) => {
    setLoading(planId)
    router.push(`/checkout?plan=${planId}`)
  }

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-px" style={{ backgroundColor: 'rgba(89,65,59,0.2)' }}>
      {PLANS.map((plan) => {
        const price = prices[plan.id as keyof Prices]?.price ?? 0
        return (
          <div
            key={plan.id}
            className="flex flex-col relative p-10"
            style={{
              backgroundColor: plan.featured ? '#1c1b1b' : '#131313',
              outline: plan.featured ? '2px solid #D94F2E' : 'none',
              outlineOffset: plan.featured ? '-1px' : undefined,
            }}
          >
            {plan.badge && (
              <div
                className="absolute font-bold uppercase tracking-widest"
                style={{
                  top: plan.featured ? '-14px' : '12px',
                  left: plan.featured ? '50%' : '1.5rem',
                  transform: plan.featured ? 'translateX(-50%)' : 'none',
                  backgroundColor: plan.featured ? '#D94F2E' : 'transparent',
                  color: plan.featured ? '#131313' : '#D94F2E',
                  border: plan.featured ? 'none' : '1px solid rgba(217,79,46,0.4)',
                  padding: '3px 16px',
                  fontSize: '10px',
                  whiteSpace: 'nowrap',
                }}
              >
                {plan.badge}
              </div>
            )}

            <div className={plan.badge && !plan.featured ? 'mt-8' : 'mt-4'}>
              <h3
                className="text-2xl mb-1"
                style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', color: '#e5e2e1' }}
              >
                {plan.name}
              </h3>
              <p className="text-xs mb-8" style={{ color: 'rgba(229,226,225,0.4)' }}>
                {plan.subtitle}
              </p>

              <div className="flex items-baseline gap-1 mb-10">
                <span
                  style={{
                    fontFamily: "'Newsreader', serif",
                    fontStyle: 'italic',
                    fontSize: '2.75rem',
                    lineHeight: 1,
                    color: '#e5e2e1',
                  }}
                >
                  R${price.toFixed(0)}
                </span>
                <span className="text-sm ml-1" style={{ color: 'rgba(229,226,225,0.4)' }}>
                  {plan.period}
                </span>
              </div>

              <ul className="space-y-4 mb-10 flex-grow">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm" style={{ color: plan.featured ? '#e5e2e1' : 'rgba(229,226,225,0.65)' }}>
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => handleCheckout(plan.id)}
              disabled={loading === plan.id}
              className="w-full py-4 text-sm font-bold uppercase tracking-widest transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-auto"
              style={
                plan.featured
                  ? { backgroundColor: '#D94F2E', color: '#fff' }
                  : { border: '1px solid #D94F2E', color: '#D94F2E', backgroundColor: 'transparent' }
              }
            >
              {loading === plan.id ? 'Aguarde...' : plan.cta}
            </button>
          </div>
        )
      })}
    </div>
  )
}
