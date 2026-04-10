'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const plans = [
  {
    id: 'perPhoto',
    label: 'Single Asset',
    name: 'The Occasional',
    price: 'R$19',
    period: '/foto',
    features: [
      { icon: 'auto_fix_high',            text: '1 foto restaurada' },
      { icon: 'photo_size_select_actual', text: 'Download em alta resolução' },
      { icon: 'schedule',                  text: 'Resultado em segundos' },
      { icon: 'payments',                  text: 'PIX, cartão ou boleto' },
    ],
    cta: 'Começar agora',
    featured: false,
  },
  {
    id: 'subscription',
    label: 'Monthly Membership',
    name: 'The Archivist',
    price: 'R$59',
    period: '/mês',
    features: [
      { icon: 'filter_frames', text: '10 fotos por mês' },
      { icon: 'bolt',          text: 'Processamento prioritário' },
      { icon: 'cloud_done',    text: 'Histórico completo' },
      { icon: 'hd',            text: 'Download em 4K' },
      { icon: 'support_agent', text: 'Suporte prioritário' },
    ],
    cta: 'Assinar agora',
    featured: true,
  },
  {
    id: 'package',
    label: 'Bulk Package',
    name: 'The Collector',
    price: 'R$129',
    period: '/pacote',
    features: [
      { icon: 'auto_awesome_motion', text: '10 créditos permanentes' },
      { icon: 'verified_user',       text: 'Sem expiração' },
      { icon: 'layers',              text: 'Use quando quiser' },
      { icon: 'history_edu',         text: 'Histórico salvo' },
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
      {/* Header */}
      <div className="text-center mb-24 max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-[0.4em] font-medium mb-6" style={{ color: '#D94F2E' }}>
          Preços
        </p>
        <h2
          className="text-5xl md:text-7xl tracking-tight mb-6"
          style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', color: '#e5e2e1' }}
        >
          Escolha sua jornada
        </h2>
        <p className="text-sm uppercase tracking-[0.2em] max-w-md mx-auto" style={{ color: 'rgba(229,226,225,0.4)' }}>
          Selecione o plano ideal e restaure suas memórias com precisão cinematográfica.
        </p>
      </div>

      {/* Cards grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-0">
        {plans.map((plan, i) => (
          <div
            key={plan.id}
            className="flex flex-col relative"
            style={{
              padding: '3rem',
              backgroundColor: plan.featured ? '#1c1b1b' : '#0e0e0e',
              border: plan.featured ? '2px solid #D94F2E' : '1px solid rgba(89,65,59,0.2)',
              marginTop: plan.featured ? '-1.5rem' : undefined,
              marginBottom: plan.featured ? '-1.5rem' : undefined,
              zIndex: plan.featured ? 10 : undefined,
              boxShadow: plan.featured ? '0 40px 100px -20px rgba(0,0,0,0.7)' : undefined,
            }}
          >
            {plan.featured && (
              <div
                className="absolute font-bold uppercase tracking-[0.25em]"
                style={{
                  top: '-14px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#D94F2E',
                  color: '#131313',
                  padding: '4px 24px',
                  fontSize: '10px',
                  whiteSpace: 'nowrap',
                }}
              >
                Mais Popular
              </div>
            )}

            {/* Title */}
            <div className="mb-10">
              <h3
                className="mb-1"
                style={{
                  fontFamily: "'Newsreader', serif",
                  fontStyle: 'italic',
                  fontSize: plan.featured ? '2rem' : '1.75rem',
                  color: '#e5e2e1',
                }}
              >
                {plan.name}
              </h3>
              <p
                className="text-xs uppercase tracking-widest font-semibold"
                style={{ color: plan.featured ? '#D94F2E' : 'rgba(229,226,225,0.3)' }}
              >
                {plan.label}
              </p>
            </div>

            {/* Price */}
            <div className="mb-14">
              <div className="flex items-baseline gap-1">
                <span
                  style={{
                    fontFamily: "'Newsreader', serif",
                    fontStyle: 'italic',
                    fontSize: plan.featured ? '3rem' : '2.5rem',
                    color: '#e5e2e1',
                  }}
                >
                  {plan.price}
                </span>
                <span className="text-sm" style={{ color: 'rgba(229,226,225,0.4)' }}>{plan.period}</span>
              </div>
            </div>

            {/* Features */}
            <ul className="flex-grow space-y-5 mb-14">
              {plan.features.map((f) => (
                <li key={f.text} className="flex items-center gap-4">
                  <span
                    className="material-symbols-outlined"
                    style={{
                      color: '#D94F2E',
                      fontSize: '18px',
                      fontVariationSettings: "'FILL' 0, 'wght' 200, 'GRAD' 0, 'opsz' 24",
                    }}
                  >
                    {f.icon}
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: plan.featured ? '#e5e2e1' : 'rgba(229,226,225,0.6)' }}
                  >
                    {f.text}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={() => handleCheckout(plan.id)}
              disabled={loading === plan.id}
              className="w-full py-5 text-xs uppercase tracking-[0.2em] font-bold transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              style={
                plan.featured
                  ? { backgroundColor: '#D94F2E', color: '#131313' }
                  : { border: '1px solid rgba(89,65,59,0.4)', color: '#e5e2e1', backgroundColor: 'transparent' }
              }
            >
              {loading === plan.id ? 'Aguarde...' : plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Security note */}
      <p className="text-center text-xs mt-12 flex items-center justify-center gap-2" style={{ color: 'rgba(229,226,225,0.3)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        Pagamentos processados com segurança. PIX, cartão ou boleto via Mercado Pago.
      </p>
    </section>
  )
}
