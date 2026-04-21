import { createAdminClient } from '@/lib/supabase/admin'
import PricingCards from './PricingCards'

const DEFAULTS = {
  perPhoto:     { price: 19.00 },
  subscription: { price: 59.00 },
  package:      { price: 129.00 },
  starter:      { price: 47.00 },
  popular:      { price: 79.00 },
  pro:          { price: 149.00 },
  agency:       { price: 397.00 },
}

export default async function Pricing() {
  let prices = { ...DEFAULTS }
  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from('plans').select('id, price')
    data?.forEach((r: { id: string; price: number }) => {
      if (r.id in prices) prices[r.id as keyof typeof prices] = { price: parseFloat(String(r.price)) }
    })
  } catch {}

  return (
    <section id="pricing" className="py-32 px-6 bg-[#131315]">
      {/* Cabeçalho */}
      <div className="text-center mb-24 max-w-4xl mx-auto">
        <p className="text-[10px] uppercase tracking-[0.4em] font-bold mb-6 text-[#D4FF00]">
          PLANOS E ASSINATURAS
        </p>
        <h2
          className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 font-display uppercase"
        >
          INVESTIMENTO <span className="text-white/20">HONESTO</span>
        </h2>
        <p className="text-base text-white/40 max-w-xl mx-auto font-sans leading-relaxed">
          Sem contratos de longo prazo. Escolha o pacote de créditos que melhor se adapta 
          ao seu volume de criação.
        </p>
      </div>

      <PricingCards prices={prices} />

      {/* Garantia */}
      <div className="text-center mt-10 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(229,226,225,0.35)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Pagamento 100% seguro via Mercado Pago
        </div>
        <p className="text-xs" style={{ color: 'rgba(229,226,225,0.25)' }}>
          Sem fidelidade. Cancele quando quiser.
        </p>
      </div>
    </section>
  )
}
