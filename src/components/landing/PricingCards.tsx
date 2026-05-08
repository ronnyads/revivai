import { Check, ArrowRight } from 'lucide-react'
import MetaCheckoutLink from '@/components/MetaCheckoutLink'

type Capability = { label: string; count: number; unit: string; locked?: boolean }

const STUDIO_PLANS = [
  {
    id: 'starter',
    name: 'ROOKIE',
    subtitle: 'Iniciante',
    price: 39.90,
    credits: 500,
    popular: false,
    perks: ['Suporte por e-mail', '90 dias de galeria'],
    capabilities: [
      { label: 'Imagens Premium', count: 62, unit: 'imagens' },
      { label: 'Vídeos Padrão', count: 33, unit: 'vídeos' },
      { label: 'Vídeos com Fala', count: 5, unit: 'vídeos' },
      { label: 'Vozes / Áudios', count: 166, unit: 'áudios' },
      { label: 'Scripts IA', count: 166, unit: 'scripts' },
      { label: 'UGC Bundle', locked: true, count: 0, unit: '' },
    ] as Capability[],
  },
  {
    id: 'popular',
    name: 'CREATOR',
    subtitle: 'Criador',
    price: 79,
    credits: 1100,
    popular: true,
    perks: ['Velocidade maior nas gerações', '180 dias de galeria'],
    capabilities: [
      { label: 'Imagens Premium', count: 137, unit: 'imagens' },
      { label: 'Vídeos Padrão', count: 73, unit: 'vídeos' },
      { label: 'Vídeos com Fala', count: 11, unit: 'vídeos' },
      { label: 'Vozes / Áudios', count: 366, unit: 'áudios' },
      { label: 'Scripts IA', count: 366, unit: 'scripts' },
      { label: 'UGC Bundle', count: 18, unit: 'bundles' },
    ] as Capability[],
  },
  {
    id: 'pro',
    name: 'PRO',
    subtitle: 'Profissional',
    price: 149,
    credits: 2500,
    popular: false,
    perks: ['Upscaling 4K Ultra', '180 dias de galeria'],
    capabilities: [
      { label: 'Imagens Premium', count: 312, unit: 'imagens' },
      { label: 'Vídeos Padrão', count: 166, unit: 'vídeos' },
      { label: 'Vídeos com Fala', count: 26, unit: 'vídeos' },
      { label: 'Vozes / Áudios', count: 833, unit: 'áudios' },
      { label: 'Scripts IA', count: 833, unit: 'scripts' },
      { label: 'UGC Bundle', count: 41, unit: 'bundles' },
    ] as Capability[],
  },
  {
    id: 'agency',
    name: 'STUDIO',
    subtitle: 'Agência',
    price: 297,
    credits: 6000,
    popular: false,
    perks: ['White Label', 'Suporte VIP prioritário'],
    capabilities: [
      { label: 'Imagens Premium', count: 750, unit: 'imagens' },
      { label: 'Vídeos Padrão', count: 400, unit: 'vídeos' },
      { label: 'Vídeos com Fala', count: 64, unit: 'vídeos' },
      { label: 'Vozes / Áudios', count: 2000, unit: 'áudios' },
      { label: 'Scripts IA', count: 2000, unit: 'scripts' },
      { label: 'UGC Bundle', count: 100, unit: 'bundles' },
    ] as Capability[],
  },
]

const KIRVANO_LINKS: Record<string, string> = {
  starter: 'https://pay.kirvano.com/742d82bb-2ce1-4db6-88e6-f7da3a56897d',
  popular: 'https://pay.kirvano.com/643c2622-c454-4dc5-a85e-da2276b7d944',
  pro: 'https://pay.kirvano.com/781f1a63-1608-4fcf-be7c-cc1cf1680348',
  agency: 'https://pay.kirvano.com/bb19dade-47d9-4801-ac48-8a4b05bd4367',
}

function formatPrice(price: number) {
  return price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function PricingCards({ prices }: { prices: Record<string, { price: number }> }) {
  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STUDIO_PLANS.map((plan, i) => {
          const price = prices[plan.id]?.price ?? plan.price
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col p-8 group transition-all duration-1000 cursor-default ${
                plan.popular
                  ? 'tonal-layer-2 scale-[1.03] z-10 border border-[#54D6F6]/18 shadow-[0_0_80px_rgba(84,214,246,0.08)]'
                  : `border border-white/6 ${i % 2 === 0 ? 'tonal-layer-1' : 'tonal-layer-2'}`
              }`}
            >
              <div className="absolute inset-0 bg-[#54D6F6]/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

              {plan.popular && (
                <div className="absolute -top-4 right-8">
                  <span className="bg-cyan-gradient text-[#031317] text-[9px] font-bold uppercase tracking-[0.4em] px-6 py-2 shadow-[0_0_30px_rgba(84,214,246,0.3)]">
                    MAIS POPULAR
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="mb-6">
                <p className="text-[9px] font-bold uppercase tracking-[0.5em] text-white/30 mb-1">{plan.subtitle}</p>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.5em] text-[#54D6F6] mb-4">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold font-display text-white">R$ {formatPrice(price)}</span>
                  <span className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-sans">/mês</span>
                </div>
              </div>

              {/* Credits */}
              <div className="mb-6 flex flex-col gap-1">
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-bold text-white tracking-tighter leading-none italic">
                    {plan.credits.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">créditos/mês</span>
                </div>
                <div className="h-px w-full bg-white/5 mt-3 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[#54D6F6] w-1/3 opacity-30 transform -translate-x-full group-hover:translate-x-[200%] transition-transform duration-2000 ease-in-out" />
                </div>
              </div>

              {/* Perks */}
              <ul className="space-y-2 mb-6">
                {plan.perks.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-xs font-medium text-white/40 group-hover:text-white/60 transition-colors">
                    <Check size={13} className="text-[#54D6F6] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* O que dá pra criar */}
              <div className="mb-6 flex-grow">
                <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-white/20 mb-3">O que dá pra criar</p>
                <div className="space-y-2">
                  {plan.capabilities.map((cap) => (
                    <div key={cap.label} className="flex justify-between items-center">
                      <span className="text-[11px] text-white/35">{cap.label}</span>
                      {cap.locked ? (
                        <span className="text-[10px] font-bold text-white/15 uppercase tracking-wider">Bloqueado</span>
                      ) : (
                        <span className="text-[11px] font-bold text-white/60">
                          {cap.count.toLocaleString('pt-BR')} <span className="text-white/30 font-normal">{cap.unit}</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <MetaCheckoutLink
                href={KIRVANO_LINKS[plan.id]}
                planId={plan.id}
                value={price}
                className={`group/btn relative w-full py-5 text-[10px] font-bold uppercase tracking-[0.4em] transition-all duration-700 overflow-hidden flex items-center justify-center gap-4 rounded-full ${
                  plan.popular
                    ? 'bg-cyan-gradient text-[#031317] shadow-[0_18px_50px_rgba(84,214,246,0.18)] hover:brightness-110'
                    : 'border border-[#54D6F6]/18 bg-[#0C171A] text-[#D7E4E8] hover:border-[#54D6F6]/45 hover:text-[#54D6F6]'
                }`}
              >
                Começar agora <ArrowRight size={14} className="group-hover/btn:translate-x-3 transition-transform duration-700" />
              </MetaCheckoutLink>
            </div>
          )
        })}
      </div>
    </div>
  )
}
