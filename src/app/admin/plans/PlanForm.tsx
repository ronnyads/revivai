'use client'

import { useActionState } from 'react'
import { upsertPlan } from './actions'

type Plan = { id: string; name: string; price: number; credits: number; description: string }
type Props = { plan: Plan; badge: string }

export default function PlanForm({ plan, badge }: Props) {
  const [state, action, pending] = useActionState(upsertPlan, null)

  return (
    <form action={action} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-4">
      <input type="hidden" name="id" value={plan.id} />

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-white/30">{plan.id === 'perPhoto' ? 'Avulso' : plan.id === 'subscription' ? 'Assinatura' : 'Pacote'}</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-white/30">{badge}</span>
      </div>

      <div>
        <label className="text-xs text-white/40 mb-1 block uppercase tracking-wide">Nome</label>
        <input name="name" defaultValue={plan.name} required
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D94F2E]/60 transition-colors" />
      </div>

      <div>
        <label className="text-xs text-white/40 mb-1 block uppercase tracking-wide">Preço (R$)</label>
        <input name="price" type="number" step="0.01" min="0" defaultValue={plan.price} required
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D94F2E]/60 transition-colors" />
      </div>

      <div>
        <label className="text-xs text-white/40 mb-1 block uppercase tracking-wide">Créditos incluídos</label>
        <input name="credits" type="number" min="1" defaultValue={plan.credits} required
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D94F2E]/60 transition-colors" />
      </div>

      <div>
        <label className="text-xs text-white/40 mb-1 block uppercase tracking-wide">Descrição curta</label>
        <input name="description" defaultValue={plan.description}
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D94F2E]/60 transition-colors" />
      </div>

      {state?.ok === true && (
        <p className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
          ✓ Salvo com sucesso
        </p>
      )}
      {state?.ok === false && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          ✗ Erro: {state.error}
        </p>
      )}

      <button type="submit" disabled={pending}
        className="w-full py-2.5 rounded-lg bg-[#D94F2E] text-white text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50">
        {pending ? 'Salvando...' : 'Salvar plano'}
      </button>
    </form>
  )
}
