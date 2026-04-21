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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STUDIO_PLANS.map((plan, i) => {
          const price = prices[plan.id]?.price ?? plan.price
          const features = planFeatures(plan.base, plan.bonus, plan.id)
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col p-12 group transition-all duration-1000 cursor-default ${
                plan.popular 
                  ? 'tonal-layer-2 scale-[1.05] z-10 shadow-[0_0_80px_rgba(124,13,242,0.05)]' 
                  : i % 2 === 0 ? 'tonal-layer-1' : 'tonal-layer-2'
              }`}
            >
              <div className="absolute inset-0 bg-[#7C0DF2]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
              
              {plan.popular && (
                <div className="absolute -top-4 right-8">
                  <span className="bg-[#7C0DF2] text-white text-[9px] font-bold uppercase tracking-[0.4em] px-6 py-2 shadow-[0_0_30px_rgba(124,13,242,0.3)]">
                    FAVORITO
                  </span>
                </div>
              )}

              <div className="mb-14">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.5em] text-[#7C0DF2] mb-6">{plan.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold font-display text-white">R$ {price.toFixed(0)}</span>
                  <span className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-sans">/mo</span>
                </div>
              </div>

              <div className="mb-14 flex flex-col gap-1 pr-4">
                <div className="flex justify-between items-end">
                   <span className="text-3xl font-bold text-white tracking-tighter leading-none italic">
                     {(plan.base + plan.bonus).toLocaleString('pt-BR')}
                   </span>
                   <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">créditos</span>
                </div>
                <div className="h-px w-full bg-white/5 mt-6 relative overflow-hidden">
                   <div className="absolute inset-0 bg-[#7C0DF2] w-1/3 opacity-30 transform -translate-x-full group-hover:translate-x-[200%] transition-transform duration-2000 ease-in-out" />
                </div>
              </div>

              <ul className="space-y-6 mb-16 flex-grow">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-4 text-xs font-medium text-white/40 group-hover:text-white/70 transition-colors">
                    <Check size={16} className="text-[#7C0DF2] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loading === plan.id}
                className={`group/btn relative w-full py-6 text-[10px] font-bold uppercase tracking-[0.4em] transition-all duration-700 overflow-hidden flex items-center justify-center gap-4 rounded-full ${
                  plan.popular
                    ? 'bg-[#7C0DF2] text-white hover:bg-white hover:text-[#131313]'
                    : 'tonal-layer-0 text-white hover:bg-white hover:text-[#131313]'
                }`}
              >
                {loading === plan.id ? 'PROCESSING...' : (
                  <>
                    SELECT PLAN <ArrowRight size={14} className="group-hover/btn:translate-x-3 transition-transform duration-700" />
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
