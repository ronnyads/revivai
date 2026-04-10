'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="8" cy="8" r="8" fill="#D94F2E" fillOpacity="0.15" />
    <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="#D94F2E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const plans = [
  {
    id: 'perPhoto',
    badge: null,
    name: 'Avulso',
    subtitle: 'Para usar quando precisar',
    price: 'R$19',
    period: 'por foto',
    features: [
      '1 foto restaurada',
      'Download em alta resolução',
      'Resultado em segundos',
      'PIX, cartão ou boleto',
    ],
    cta: 'Restaurar uma foto',
    featured: false,
  },
  {
    id: 'subscription',
    badge: 'Mais popular',
    name: 'Assinatura',
    subtitle: 'Para quem restaura com frequência',
    price: 'R$59',
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
    price: 'R$129',
    period: '10 créditos',
    features: [
      '10 créditos permanentes',
      'Use quando e como quiser',
      'Download em alta resolução',
      'Histórico salvo para sempre',
    ],
    cta: 'Comprar créditos',
    featured: false,
  },
]

export default function Pricing() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleCheckout = (planId: string) => {
    setLoading(planId)
    router.push(`/checkout?plan=${planId}`)
  }

  return (
    <section id="pricing" className="py-28 px-6" style={{ backgroundColor: '#131313' }}>
      {/* Cabeçalho */}
      <div className="text-center mb-20 max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-[0.4em] font-medium mb-6" style={{ color: '#D94F2E' }}>
          Preços
        </p>
        <h2
          className="text-5xl md:text-6xl tracking-tight mb-4"
          style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', color: '#e5e2e1' }}
        >
          Simples e sem surpresas
        </h2>
        <p className="text-base" style={{ color: 'rgba(229,226,225,0.5)' }}>
          Sem assinatura obrigatória. Pague com PIX, cartão ou boleto.
        </p>
      </div>

      {/* Cards */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-px" style={{ backgroundColor: 'rgba(89,65,59,0.2)' }}>
        {plans.map((plan) => (
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
                  {plan.price}
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
                  : { border: '1px solid rgba(229,226,225,0.2)', color: '#e5e2e1', backgroundColor: 'transparent' }
              }
            >
              {loading === plan.id ? 'Aguarde...' : plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Garantia */}
      <div className="text-center mt-10 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(229,226,225,0.35)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Pagamento 100% seguro via Mercado Pago
        </div>
        <p className="text-xs" style={{ color: 'rgba(229,226,225,0.25)' }}>
          Sem fidelidade. Cancele quando quiser.
        </p>
      </div>
    </section>
  )
}
