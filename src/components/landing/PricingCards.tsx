import { Check, ArrowRight } from 'lucide-react'

const STUDIO_PLANS = [
  {
    id: 'starter',
    name: 'ROOKIE',
    price: 47,
    base: 500,
    bonus: 100,
    popular: false,
    perks: ['Gerações HD', 'Modelos Padrão'],
  },
  {
    id: 'popular',
    name: 'CREATOR',
    price: 79.9,
    base: 1000,
    bonus: 200,
    popular: true,
    perks: ['Texturas 8K', 'Consistência de Marca'],
  },
  {
    id: 'pro',
    name: 'PRO',
    price: 149,
    base: 2500,
    bonus: 500,
    popular: false,
    perks: ['Upscaling 4K Ultra', 'Presets de Moda'],
  },
  {
    id: 'agency',
    name: 'STUDIO',
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

const KIRVANO_LINKS: Record<string, string> = {
  starter: 'https://pay.kirvano.com/742d82bb-2ce1-4db6-88e6-f7da3a56897d',
  popular: 'https://pay.kirvano.com/643c2622-c454-4dc5-a85e-da2276b7d944',
  pro: 'https://pay.kirvano.com/781f1a63-1608-4fcf-be7c-cc1cf1680348',
  agency: 'https://pay.kirvano.com/bb19dade-47d9-4801-ac48-8a4b05bd4367',
}

function formatPrice(price: number) {
  return price.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function PricingCards({ prices }: { prices: Prices }) {

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
                  ? 'tonal-layer-2 scale-[1.05] z-10 border border-[#54D6F6]/18 shadow-[0_0_80px_rgba(84,214,246,0.08)]' 
                  : `border border-white/6 ${i % 2 === 0 ? 'tonal-layer-1' : 'tonal-layer-2'}`
              }`}
            >
              <div className="absolute inset-0 bg-[#54D6F6]/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
              
              {plan.popular && (
                <div className="absolute -top-4 right-8">
                  <span className="bg-cyan-gradient text-[#031317] text-[9px] font-bold uppercase tracking-[0.4em] px-6 py-2 shadow-[0_0_30px_rgba(84,214,246,0.3)]">
                    FAVORITO
                  </span>
                </div>
              )}

              <div className="mb-14">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.5em] text-[#54D6F6] mb-6">{plan.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold font-display text-white">R$ {formatPrice(price)}</span>
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
                   <div className="absolute inset-0 bg-[#54D6F6] w-1/3 opacity-30 transform -translate-x-full group-hover:translate-x-[200%] transition-transform duration-2000 ease-in-out" />
                </div>
              </div>

              <ul className="space-y-6 mb-16 flex-grow">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-4 text-xs font-medium text-white/40 group-hover:text-white/70 transition-colors">
                    <Check size={16} className="text-[#54D6F6] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={KIRVANO_LINKS[plan.id]}
                target="_blank"
                rel="noopener noreferrer"
                className={`group/btn relative w-full py-6 text-[10px] font-bold uppercase tracking-[0.4em] transition-all duration-700 overflow-hidden flex items-center justify-center gap-4 rounded-full ${
                  plan.popular
                    ? 'bg-cyan-gradient text-[#031317] shadow-[0_18px_50px_rgba(84,214,246,0.18)] hover:brightness-110'
                    : 'border border-[#54D6F6]/18 bg-[#0C171A] text-[#D7E4E8] hover:border-[#54D6F6]/45 hover:text-[#54D6F6]'
                }`}
              >
                SELECT PLAN <ArrowRight size={14} className="group-hover/btn:translate-x-3 transition-transform duration-700" />
              </a>
            </div>
          )
        })}
      </div>
    </div>
  )
}
