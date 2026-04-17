'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, CheckCheck } from 'lucide-react'

const STUDIO_PLANS = [
  {
    id: 'starter',
    price: 47,
    base: 500,
    bonus: 100,
    popular: false,
    coupon: 'ZAYRA500',
    perks: ['Gera imagens, vídeos e áudios.'],
  },
  {
    id: 'popular',
    price: 79,
    base: 1000,
    bonus: 100,
    popular: true,
    coupon: 'ZAYRA1000',
    perks: ['Gera imagens, vídeos e áudios.'],
  },
  {
    id: 'pro',
    price: 149,
    base: 2000,
    bonus: 100,
    popular: false,
    coupon: 'ZAYRA2000',
    perks: ['Gera imagens, vídeos e áudios.'],
  },
  {
    id: 'agency',
    price: 397,
    base: 5000,
    bonus: 100,
    popular: false,
    coupon: 'ZAYRA5000',
    perks: ['Gera imagens, vídeos e áudios.'],
  },
]

function planFeatures(base: number, bonus: number, isAgency: boolean) {
  const total = base + bonus
  return [
    `Até ${Math.floor(total / 8)} imagens em alta qualidade`,
    `Até ${Math.floor(total / 15)} vídeos animados`,
    `Até ${Math.floor(total / 3)} upscales em 4K`,
    isAgency ? 'Suporte exclusivo no WhatsApp' : 'Combinação livre entre mídias',
  ]
}

type Prices = Record<string, { price: number }>

export default function PricingCards({ prices }: { prices: Prices }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const handleCheckout = (planId: string) => {
    setLoading(planId)
    router.push(`/checkout?plan=${planId}`)
  }

  const handleCopy = (coupon: string, planId: string) => {
    navigator.clipboard.writeText(coupon).catch(() => {})
    setCopied(planId)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <span className="inline-flex items-center gap-2 border border-blue-500/40 text-blue-400 text-xs px-4 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Créditos bônus em todos os pacotes
        </span>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 mb-6">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Pagamento seguro via Pix ou Cartão
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STUDIO_PLANS.map((plan) => {
          const price = prices[plan.id]?.price ?? plan.price
          const features = planFeatures(plan.base, plan.bonus, plan.id === 'agency')
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl p-5 ${
                plan.popular
                  ? 'bg-zinc-900 border-2 border-blue-500/60 shadow-lg shadow-blue-500/10'
                  : 'bg-zinc-900/60 border border-zinc-800'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-zinc-100 text-zinc-900 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                    MAIS POPULAR
                  </span>
                </div>
              )}

              {/* Preço */}
              <div className={plan.popular ? 'mt-3' : 'mt-0'}>
                <p className="text-3xl font-bold text-white">
                  R$ {price.toFixed(0).replace('.', ',')},00
                </p>

                {/* Créditos */}
                <p className="text-lg font-semibold text-white mt-1">
                  {plan.base.toLocaleString('pt-BR')} créditos
                </p>
                <p className="text-xs text-blue-400 font-medium mb-3">
                  + {plan.bonus} créditos bônus
                </p>

                {/* Perks */}
                <p className="text-xs text-zinc-400 mb-4">{plan.perks[0]}</p>

                {/* Features */}
                <ul className="space-y-2 mb-5">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-zinc-300">
                      <Check size={13} className="text-blue-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Coupon */}
              <button
                onClick={() => handleCopy(plan.coupon, plan.id)}
                className="flex items-center justify-between w-full mb-3 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-500 transition-colors group"
              >
                <span className="text-[11px] text-zinc-400">
                  <span className="text-zinc-500 mr-1.5">20% OFF</span>
                  <span className="font-mono font-semibold text-zinc-200">{plan.coupon}</span>
                </span>
                {copied === plan.id
                  ? <CheckCheck size={13} className="text-blue-400" />
                  : <Copy size={13} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                }
              </button>

              {/* CTA */}
              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loading === plan.id}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 mt-auto ${
                  plan.popular
                    ? 'bg-white text-zinc-900 hover:bg-zinc-100'
                    : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
                }`}
              >
                {loading === plan.id ? 'Aguarde...' : 'Comprar →'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
