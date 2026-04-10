export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { upsertPlan } from './actions'

const DEFAULTS = {
  perPhoto:     { name: 'Restauração Avulsa', price: 19.00,  credits: 1,  description: '1 foto restaurada com IA em alta resolução' },
  subscription: { name: 'Assinatura Mensal',  price: 59.00,  credits: 10, description: '10 fotos por mês + histórico + download 4K' },
  package:      { name: 'Pacote 10 Créditos', price: 129.00, credits: 10, description: '10 créditos sem expiração, use quando quiser' },
}

type PlanRow = { id: string; name: string; price: number; credits: number; description: string }

export default async function PlansPage() {
  const supabase = createAdminClient()
  const { data: rows } = await supabase.from('plans').select('*')

  const plans: Record<string, PlanRow> = { ...DEFAULTS as any }
  rows?.forEach((r: PlanRow) => { plans[r.id] = r })

  const planList = [
    { id: 'perPhoto', label: 'Avulso', badge: 'por foto' },
    { id: 'subscription', label: 'Assinatura', badge: 'por mês' },
    { id: 'package', label: 'Pacote', badge: 'créditos' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Planos</h1>
        <p className="text-sm text-white/40 mt-1">Configure preços, créditos e descrições dos planos.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {planList.map(({ id, label, badge }) => {
          const p = plans[id] || DEFAULTS[id as keyof typeof DEFAULTS]
          return (
            <form key={id} action={upsertPlan} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-4">
              <input type="hidden" name="id" value={id} />

              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-white/30">{label}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-white/30">{badge}</span>
              </div>

              <div>
                <label className="text-xs text-white/40 mb-1 block uppercase tracking-wide">Nome</label>
                <input
                  name="name"
                  defaultValue={p.name}
                  required
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D94F2E]/60 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-white/40 mb-1 block uppercase tracking-wide">Preço (R$)</label>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={p.price}
                  required
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D94F2E]/60 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-white/40 mb-1 block uppercase tracking-wide">Créditos incluídos</label>
                <input
                  name="credits"
                  type="number"
                  min="1"
                  defaultValue={p.credits}
                  required
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D94F2E]/60 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-white/40 mb-1 block uppercase tracking-wide">Descrição curta</label>
                <input
                  name="description"
                  defaultValue={p.description}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D94F2E]/60 transition-colors"
                />
              </div>

              <button
                type="submit"
                className="mt-2 w-full py-2.5 rounded-lg bg-[#D94F2E] text-white text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Salvar plano
              </button>
            </form>
          )
        })}
      </div>

      <div className="mt-8 bg-white/[0.03] border border-white/[0.06] rounded-xl px-6 py-4 text-xs text-white/30">
        <strong className="text-white/50">Como funciona:</strong> As alterações são aplicadas imediatamente para novos checkouts.
        Os créditos dos usuários já existentes não são afetados.
      </div>
    </div>
  )
}
