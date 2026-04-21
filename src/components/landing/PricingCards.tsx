'use client'

import { ArrowRight, Check } from 'lucide-react'

const KIRVANO_LINKS: Record<string, string> = {
  starter: 'https://pay.kirvano.com/742d82bb-2ce1-4db6-88e6-f7da3a56897d',
  popular: 'https://pay.kirvano.com/643c2622-c454-4dc5-a85e-da2276b7d944',
  pro:     'https://pay.kirvano.com/781f1a63-1608-4fcf-be7c-cc1cf1680348',
  agency:  'https://pay.kirvano.com/bb19dade-47d9-4801-ac48-8a4b05bd4367',
}

const STUDIO_PLANS = [
  { id: 'starter', name: 'ROOKIE',   price: 47,    base: 500,  bonus: 100,  highlight: false },
  { id: 'popular', name: 'CREATOR',  price: 79.90, base: 1000, bonus: 200,  highlight: true  },
  { id: 'pro',     name: 'PRO',      price: 149,   base: 2500, bonus: 500,  highlight: false },
  { id: 'agency',  name: 'STUDIO',   price: 397,   base: 7000, bonus: 1000, highlight: false },
] as const

function planFeatures(base: number, bonus: number, id: string) {
  const total = base + bonus
  const items = [`~${Math.floor(total / 8)} gerações premium`, 'Acesso ao estúdio 24/7', 'Consistência visual de marca']

  if (id === 'popular' || id === 'pro' || id === 'agency') items.push('Texturas têxteis 8K')
  if (id === 'pro' || id === 'agency') items.push('Upscaling 4K integrado')
  if (id === 'agency') items.push('Acesso via API')

  return items
}

type Prices = Record<string, { price: number }>

export default function PricingCards({ prices }: { prices: Prices }) {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        {STUDIO_PLANS.map((plan) => {
          const price = prices[plan.id]?.price ?? plan.price
          const features = planFeatures(plan.base, plan.bonus, plan.id)

          return (
            <article
              key={plan.id}
              className={`panel-card relative flex flex-col overflow-hidden px-8 py-9 transition-transform duration-500 ${
                plan.highlight ? 'translate-y-[-8px] shadow-[0_0_60px_rgba(0,173,204,0.16)]' : ''
              }`}
            >
              {plan.highlight && (
                <div className="absolute right-0 top-0 bg-cyan-gradient px-4 py-2 font-label text-[10px] text-[#003641]">
                  recomendado
                </div>
              )}

              <div className="mb-10">
                <p className="font-label text-[11px] text-[#54D6F6]">{plan.name}</p>
                <div className="mt-6 flex items-end gap-2">
                  <span className="font-display text-5xl font-bold text-white">R$ {price.toFixed(0)}</span>
                  <span className="font-label text-[10px] text-white/28">/mês</span>
                </div>
              </div>

              <div className="mb-10 border-b border-white/6 pb-8">
                <div className="flex items-end justify-between gap-4">
                  <span className="font-display text-3xl font-bold tracking-tight text-white">
                    {(plan.base + plan.bonus).toLocaleString('pt-BR')}
                  </span>
                  <span className="font-label text-[10px] text-white/28">créditos</span>
                </div>
              </div>

              <ul className="mb-12 flex flex-1 flex-col gap-4">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm leading-relaxed text-white/56">
                    <Check size={16} className="mt-0.5 shrink-0 text-[#54D6F6]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={KIRVANO_LINKS[plan.id]}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-3 rounded-full px-5 py-4 font-label text-xs transition-all duration-300 ${
                  plan.highlight
                    ? 'bg-cyan-gradient text-[#003641] hover:-translate-y-0.5'
                    : 'border border-white/10 text-white hover:border-[#54D6F6]/30 hover:bg-white/5'
                }`}
              >
                Selecionar plano
                <ArrowRight size={16} />
              </a>
            </article>
          )
        })}
      </div>
    </div>
  )
}
