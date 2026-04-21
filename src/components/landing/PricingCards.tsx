'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ArrowRight } from 'lucide-react'

const STUDIO_PLANS = [
  {
    id: 'starter',
    name: 'Rookie',
    price: 47,
    base: 500,
    bonus: 100,
    popular: false,
    perks: ['Gera imagens, vídeos e áudios.'],
  },
  {
    id: 'popular',
    name: 'Creator',
    price: 79,
    base: 1000,
    bonus: 100,
    popular: true,
    perks: ['Gera imagens, vídeos e áudios.'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 149,
    base: 2000,
    bonus: 100,
    popular: false,
    perks: ['Gera imagens, vídeos e áudios.'],
  },
  {
    id: 'agency',
    name: 'Studio',
    price: 397,
    base: 5000,
    bonus: 100,
    popular: false,
    perks: ['Gera imagens, vídeos e áudios.'],
  },
]

function planFeatures(base: number, bonus: number, isAgency: boolean) {
  const total = base + bonus
  return [
    `Até ${Math.floor(total / 8)} imagens HQ`,
    `Até ${Math.floor(total / 15)} vídeos animados`,
    `Upscale 4K nativo`,
    isAgency ? 'Suporte VIP WhatsApp' : 'Uso flexível entre mídias',
  ]
}

type Prices = Record<string, { price: number }>

export default function PricingCards({ prices }: { prices: Prices }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleCheckout = (planId: string) => {
    setLoading(planId)
    router.push(`/checkout?plan=${planId}`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {STUDIO_PLANS.map((plan) => {
          const price = prices[plan.id]?.price ?? plan.price
          const features = planFeatures(plan.base, plan.bonus, plan.id === 'agency')
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col p-8 group transition-all duration-500 bg-[#201f22] border ${
                plan.popular ? 'border-[#D4FF00]' : 'border-white/5'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-8">
                  <span className="bg-[#D4FF00] text-[#131315] text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1">
                    MAIS RECOMENDADO
                  </span>
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4FF00]/60 mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold font-display text-white">R$ {price.toFixed(0)}</span>
                  <span className="text-xs text-white/30 lowercase font-sans">/pacote</span>
                </div>
              </div>

              <div className="mb-8 flex flex-col gap-1">
                <span className="text-xl font-bold text-white tracking-tight">
                  {plan.base.toLocaleString('pt-BR')} Créditos
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4FF00]">
                  + {plan.bonus} BÔNUS INCLUSO
                </span>
              </div>

              <ul className="space-y-4 mb-10 flex-grow">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-xs tracking-tight text-white/50">
                    <Check size={14} className="text-[#D4FF00] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loading === plan.id}
                className={`group/btn relative w-full py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 ${
                  plan.popular
                    ? 'bg-[#D4FF00] text-[#131315]'
                    : 'bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                {loading === plan.id ? 'PROCESSANDO...' : (
                  <>
                    SELECIONAR PLANO <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
