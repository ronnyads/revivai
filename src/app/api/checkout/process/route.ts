export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Payment } from 'mercadopago'
import { getMPClient, PLANS, type PlanType } from '@/lib/mercadopago'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { formData, planId } = await req.json() as { formData: any; planId: PlanType }
  const plan = PLANS[planId]
  if (!plan) return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })

  try {
    const client = getMPClient()
    const payment = new Payment(client)

    const result = await payment.create({
      body: {
        ...formData,
        transaction_amount: plan.price,
        description: `reviv.ai — ${plan.name}`,
        metadata: {
          planId,
          userId: user.id,
          credits: plan.credits,
        },
        payer: {
          ...formData.payer,
          email: formData.payer?.email || user.email,
        },
      },
    })

    console.log(`[checkout/process] payment id=${result.id} status=${result.status} plan=${planId} user=${user.id}`)

    // Se aprovado, credita imediatamente (webhook é backup)
    if (result.status === 'approved') {
      const admin = createAdminClient()

      if (planId === 'subscription') {
        await admin.from('users')
          .update({ plan: 'subscription', credits: plan.credits })
          .eq('id', user.id)
      } else {
        await admin.rpc('add_credits', { user_id_param: user.id, amount: plan.credits })
        if (planId === 'package') {
          await admin.from('users').update({ plan: 'package' }).eq('id', user.id)
        }
      }

      // Registrar pedido
      await admin.from('orders').insert({
        user_id:   user.id,
        type:      planId === 'perPhoto' ? 'per_photo' : planId === 'subscription' ? 'subscription' : 'package',
        stripe_id: String(result.id),
        amount:    Math.round(plan.price * 100),
        status:    'paid',
      })
    }

    return NextResponse.json({
      status:     result.status,
      payment_id: result.id,
    })

  } catch (err: any) {
    console.error('[checkout/process] error:', err.message)
    return NextResponse.json({ error: err.message ?? 'Erro ao processar pagamento' }, { status: 500 })
  }
}
