'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ArrowRight } from 'lucide-react'

const STUDIO_PLANS = [
  {
    id: 'starter',
    name: 'BASIC STUDIO',
    price: 47,
    base: 500,
    bonus: 100,
    popular: false,
    perks: ['Gerações HD', 'Modelos Padrão'],
  },
  {
    id: 'popular',
    name: 'PROFESSIONAL',
    price: 79,
    base: 1000,
    bonus: 200,
    popular: true,
    perks: ['Texturas 8K', 'Consistência de Marca'],
  },
  {
    id: 'pro',
    name: 'ELITE LOOKBOOK',
    price: 149,
    base: 2500,
    bonus: 500,
    popular: false,
    perks: ['Upscaling 4K Ultra', 'Presets de Moda'],
  },
  {
    id: 'agency',
    name: 'ENTERPRISE',
    price: 397,
    base: 7000,
    bonus: 1000,
    popular: false,
    perks: ['White Label', 'Suporte VIP'],
  },
]

function planFeatures(base: number, bonus: number, id: string) {
  const total = base + bonus
  const baseFeatures = [
    `~${Math.floor(total / 8)} gerações premium`,
    'Acesso ao estúdio 24/7',
    'Consistência de rosto IA',
  ]
  
  if (id === 'popular' || id === 'pro' || id === 'agency') {
    baseFeatures.push('Texturas têxteis 8K')
  }
  
  if (id === 'pro' || id === 'agency') {
    baseFeatures.push('Upscaling 4K integrado')
  }

  if (id === 'agency') {
    baseFeatures.push('Acesso via API')
  }

  return baseFeatures
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
          const features = planFeatures(plan.base, plan.bonus, plan.id)
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col p-10 group transition-all duration-700 bg-[#201f22] border ${
                plan.popular ? 'border-[#D4FF00]' : 'border-white/5'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-10">
                  <span className="bg-[#D4FF00] text-[#131315] text-[9px] font-bold uppercase tracking-[0.3em] px-4 py-1.5">
                    RECOMENDADO
                  </span>
                </div>
              )}

              <div className="mb-10">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#D4FF00]/60 mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold font-display text-white">R$ {price.toFixed(0)}</span>
                  <span className="text-[10px] text-white/30 uppercase tracking-widest font-sans ml-1">/fatura</span>
                </div>
              </div>

              <div className="mb-10 flex flex-col gap-1 pr-4">
                <div className="flex justify-between items-end">
                   <span className="text-2xl font-bold text-white tracking-tighter">
                     {(plan.base + plan.bonus).toLocaleString('pt-BR')}
                   </span>
                   <span className="text-[9px] font-bold text-white/40 mb-1 uppercase tracking-widest">créditos</span>
                </div>
                <div className="h-1 w-full bg-white/5 mt-2 overflow-hidden">
                   <div className="h-full bg-[#D4FF00] w-2/3 opacity-30" />
                </div>
              </div>

              <ul className="space-y-4 mb-12 flex-grow">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[11px] font-medium tracking-tight text-white/50">
                    <Check size={14} className="text-[#D4FF00] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loading === plan.id}
                className={`group/btn relative w-full py-5 text-[10px] font-bold uppercase tracking-[0.3em] transition-all duration-500 overflow-hidden flex items-center justify-center gap-3 ${
                  plan.popular
                    ? 'bg-[#D4FF00] text-[#131315] hover:bg-white'
                    : 'bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                {loading === plan.id ? 'PROCESSANDO...' : (
                  <>
                    SELECIONAR <ArrowRight size={14} className="group-hover/btn:translate-x-2 transition-transform" />
                  </>
                )}
              </button>
              
              <div className="mt-6 text-center">
                 <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">Custo por imagem: ~R$ {(price / ((plan.base + plan.bonus)/8)).toFixed(2)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
