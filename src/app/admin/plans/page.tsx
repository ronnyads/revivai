export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import PlanForm from './PlanForm'

const DEFAULTS = {
  perPhoto:     { id: 'perPhoto',     name: 'Restauração Avulsa',  price: 19.00,  credits: 1,  description: '1 foto restaurada com IA em alta resolução' },
  subscription: { id: 'subscription', name: 'Assinatura Mensal',   price: 59.00,  credits: 10, description: '10 fotos por mês + histórico + download 4K' },
  package:      { id: 'package',      name: 'Pacote 10 Créditos',  price: 129.00, credits: 10, description: '10 créditos sem expiração, use quando quiser' },
}

const BADGES = { perPhoto: 'por foto', subscription: 'por mês', package: 'créditos' }

export default async function PlansPage() {
  const supabase = createAdminClient()
  const { data: rows } = await supabase.from('plans').select('*')

  const plans = { ...DEFAULTS } as typeof DEFAULTS
  rows?.forEach((r: any) => {
    if (r.id in plans) plans[r.id as keyof typeof plans] = r
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Planos</h1>
        <p className="text-sm text-white/40 mt-1">Configure preços, créditos e descrições dos planos.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {(['perPhoto', 'subscription', 'package'] as const).map(id => (
          <PlanForm key={id} plan={plans[id]} badge={BADGES[id]} />
        ))}
      </div>

      <div className="mt-8 bg-white/[0.03] border border-white/[0.06] rounded-xl px-6 py-4 text-xs text-white/30">
        <strong className="text-white/50">Como funciona:</strong> As alterações são aplicadas imediatamente para novos checkouts. Os créditos dos usuários já existentes não são afetados.
      </div>
    </div>
  )
}
