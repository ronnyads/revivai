import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PLANS, type PlanType } from '@/lib/mercadopago'
import { Check, ShieldCheck } from 'lucide-react'
import CheckoutBrick from './CheckoutBrick'

const PLAN_FEATURES: Record<PlanType, string[]> = {
  perPhoto:     ['1 foto restaurada', 'Download em alta resolução', '4 modelos de IA', 'Resultado em segundos'],
  subscription: ['10 fotos por mês', 'Histórico completo', 'Download em 4K', 'Prioridade no processamento', 'Suporte prioritário'],
  package:      ['10 créditos permanentes', 'Use quando quiser', 'Download em alta resolução', 'Histórico salvo'],
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const { plan: planId } = await searchParams

  if (!planId || !PLANS[planId as PlanType]) redirect('/#pricing')

  const plan = PLANS[planId as PlanType]
  const features = PLAN_FEATURES[planId as PlanType]

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/checkout?plan=' + planId)

  const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY!

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-white border-b border-[#E8E8E8] px-6 py-4">
        <a href="/" className="font-display text-xl font-normal tracking-tight">
          reviv<span className="text-accent">.</span>ai
        </a>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-[1fr_1.4fr] gap-10 items-start">

          {/* Left: Order summary */}
          <div className="bg-white rounded-2xl border border-[#E8E8E8] p-8">
            <p className="text-xs font-medium tracking-widest uppercase text-muted mb-6">Resumo do pedido</p>

            <div className="mb-6">
              <h2 className="font-display text-3xl font-normal tracking-tight mb-1">{plan.name}</h2>
              <p className="text-sm text-muted">{plan.description}</p>
            </div>

            <div className="border-t border-[#E8E8E8] pt-6 mb-6">
              <ul className="flex flex-col gap-3">
                {features.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <span className="w-4 h-4 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0">
                      <Check size={10} className="text-accent" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-[#E8E8E8] pt-6">
              <div className="flex items-end justify-between">
                <span className="text-sm text-muted">Total</span>
                <div className="text-right">
                  <span className="font-display text-4xl font-normal tracking-tight">
                    R${plan.price.toFixed(2).replace('.', ',')}
                  </span>
                  {planId === 'subscription' && (
                    <p className="text-xs text-muted">por mês</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[#E8E8E8] flex items-center gap-2 text-xs text-muted">
              <ShieldCheck size={14} className="text-accent flex-shrink-0" />
              Pagamento seguro processado pelo Mercado Pago
            </div>
          </div>

          {/* Right: Payment form */}
          <div className="bg-white rounded-2xl border border-[#E8E8E8] p-8">
            <p className="text-xs font-medium tracking-widest uppercase text-muted mb-6">Dados de pagamento</p>
            <CheckoutBrick
              planId={planId}
              publicKey={publicKey}
              amount={plan.price}
              userEmail={user.email}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
