import { createAdminClient } from '@/lib/supabase/admin'
import PricingCards from '@/components/landing/PricingCards'
import { ShieldCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

const DEFAULTS = {
  perPhoto:     { price: 19.00 },
  subscription: { price: 59.00 },
  package:      { price: 129.00 },
  starter:      { price: 47.00 },
  popular:      { price: 79.00 },
  pro:          { price: 149.00 },
  agency:       { price: 397.00 },
}

export default async function BillingPage() {
  let prices = { ...DEFAULTS }
  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from('plans').select('id, price')
    data?.forEach((r: { id: string; price: number }) => {
      if (r.id in prices) prices[r.id as keyof typeof prices] = { price: parseFloat(String(r.price)) }
    })
  } catch {}

  return (
    <div className="min-h-screen bg-[#F8F6F1]">
      {/* Page Header */}
      <div className="bg-white border-b border-neutral-100 px-8 md:px-12 py-10 mb-10">
        <div className="max-w-7xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400 mb-2">REVIVAI — PLANOS</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 font-display">Investimento Honesto</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Sem contratos. Escolha o pacote de créditos que melhor se adapta ao seu volume.
          </p>
        </div>
      </div>

      {/* Pricing Cards — preserve same logic */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <PricingCards prices={prices} />

        {/* Guarantee */}
        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
            <ShieldCheck size={14} className="text-neutral-400" />
            Pagamento 100% seguro via Mercado Pago
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-300">
            SEM FIDELIDADE · CANCELE QUANDO QUISER
          </p>
        </div>
      </div>
    </div>
  )
}
