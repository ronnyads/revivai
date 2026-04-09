'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

const plans = [
  {
    id: 'perPhoto',
    name: 'Pay-per-foto',
    price: 'R$19',
    period: 'por foto, sem cadastro',
    features: ['1 foto restaurada', 'Download em alta resolução', '4 modelos de IA disponíveis', 'Resultado em segundos', 'PIX, cartão ou boleto'],
    cta: 'Pagar com PIX →',
    featured: false,
  },
  {
    id: 'subscription',
    name: 'Assinatura',
    price: 'R$59',
    period: 'por mês · 10 fotos incluídas',
    features: ['10 fotos por mês', 'Histórico completo', 'Download em 4K', 'Prioridade no processamento', 'Suporte prioritário', 'PIX, cartão ou boleto'],
    cta: 'Assinar agora →',
    featured: true,
  },
  {
    id: 'package',
    name: 'Pacote de créditos',
    price: 'R$129',
    period: '10 créditos · sem expiração',
    features: ['10 créditos permanentes', 'Use quando quiser', 'Download em alta resolução', 'Histórico salvo', 'PIX, cartão ou boleto'],
    cta: 'Comprar créditos →',
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
    <section id="pricing" className="max-w-7xl mx-auto px-8 md:px-12 py-28">
      <div className="text-center mb-16">
        <p className="flex items-center justify-center gap-3 text-xs tracking-[2px] uppercase text-accent font-medium mb-4">
          <span className="w-6 h-px bg-accent" />Preços<span className="w-6 h-px bg-accent" />
        </p>
        <h2 className="font-display text-5xl md:text-6xl font-normal tracking-tight mb-4">
          Pague pelo que <em className="italic text-accent">usar</em>
        </h2>
        <p className="text-base text-muted max-w-md mx-auto leading-relaxed">
          Sem mensalidade obrigatória. Pague via <strong>PIX</strong>, cartão ou boleto.
        </p>
        {/* Payment badges */}
        <div className="flex items-center justify-center gap-3 mt-4">
          {['PIX', 'Cartão', 'Boleto'].map(m => (
            <span key={m} className="text-xs px-3 py-1.5 rounded-full bg-surface border border-[#E8E8E8] text-muted font-medium">
              {m}
            </span>
          ))}
          <span className="text-xs text-muted">via Mercado Pago</span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map(p => (
          <div
            key={p.id}
            className={`relative rounded-xl p-10 border-[1.5px] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
              p.featured
                ? 'bg-ink text-white border-ink shadow-2xl'
                : 'bg-white border-[#E8E8E8] hover:shadow-ink/5'
            }`}
          >
            {p.featured && (
              <span className="absolute top-5 right-5 bg-accent text-white text-[10px] font-semibold tracking-widest uppercase px-3 py-1 rounded-full">
                Popular
              </span>
            )}
            <p className={`text-xs font-medium tracking-widest uppercase mb-6 ${p.featured ? 'text-white/50' : 'text-muted'}`}>
              {p.name}
            </p>
            <div className="font-display text-[56px] font-normal tracking-[-2px] leading-none mb-1">
              {p.price}
            </div>
            <p className={`text-sm mb-8 ${p.featured ? 'text-white/50' : 'text-muted'}`}>{p.period}</p>
            <ul className="flex flex-col gap-3.5 mb-9">
              {p.features.map(f => (
                <li key={f} className="flex items-center gap-3 text-sm">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${p.featured ? 'bg-accent/25' : 'bg-accent-light'}`}>
                    <Check size={10} className="text-accent" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout(p.id)}
              disabled={loading === p.id}
              className={`block w-full text-center py-3.5 rounded-lg text-sm font-medium border-[1.5px] transition-all duration-200 ${
                p.featured
                  ? 'bg-accent text-white border-accent hover:bg-accent-dark hover:border-accent-dark'
                  : 'text-ink border-[#E8E8E8] hover:border-accent hover:text-accent'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {loading === p.id ? 'Aguarde...' : p.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Security badge */}
      <p className="text-center text-xs text-muted mt-8 flex items-center justify-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Pagamentos processados com segurança. Seus dados estão protegidos.
      </p>
    </section>
  )
}
