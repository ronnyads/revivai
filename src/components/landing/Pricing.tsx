import { createAdminClient } from '@/lib/supabase/admin'
import PricingCards from './PricingCards'

const DEFAULTS = {
  perPhoto: { price: 19.0 },
  subscription: { price: 59.0 },
  package: { price: 129.0 },
  starter: { price: 47.0 },
  popular: { price: 79.9 },
  pro: { price: 149.0 },
  agency: { price: 397.0 },
}

export default async function Pricing() {
  const prices = { ...DEFAULTS }
  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from('plans').select('id, price')
    data?.forEach((row: { id: string; price: number }) => {
      if (row.id in prices) prices[row.id as keyof typeof prices] = { price: parseFloat(String(row.price)) }
    })
  } catch {}

  return (
    <section id="pricing" className="py-28 px-6 tonal-layer-0">
      <div className="mx-auto mb-20 max-w-4xl text-center">
        <p className="font-label mb-6 text-[11px] text-[#54D6F6]">Selecione seu nível operacional</p>
        <h2 className="font-display mb-6 text-5xl font-bold uppercase tracking-tight md:text-7xl">
          AUMENTE SUA <span className="text-white/25">PRODUÇÃO</span>
        </h2>
        <p className="mx-auto max-w-xl text-base leading-relaxed text-white/42">
          Escolha a intensidade certa para restauração, geração de campanhas e fluxos criativos com acabamento premium.
        </p>
      </div>

      <PricingCards prices={prices} />

      <div className="mt-10 flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2 text-xs text-white/35">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Pagamento seguro via Mercado Pago
        </div>
        <p className="text-xs text-white/25">Sem fidelidade. Escale ou pause quando precisar.</p>
      </div>
    </section>
  )
}
