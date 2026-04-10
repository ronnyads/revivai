export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Payment } from 'mercadopago'
import { getMPClient, PLANS, type PlanType } from '@/lib/mercadopago'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { formData, planId } = await req.json() as { formData: any; planId: PlanType }
  const plan = PLANS[planId]
  if (!plan) return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })

  const payerEmail = formData.payer?.email || user?.email
  if (!payerEmail) return NextResponse.json({ error: 'Email não encontrado no pagamento' }, { status: 400 })

  const admin = createAdminClient()
  let userId = user?.id
  let isGuest = !user

  // Se não está logado, cria a conta com o email do pagamento
  if (!user) {
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: payerEmail,
      email_confirm: true,
    })

    if (!createError && newUser.user) {
      userId = newUser.user.id
      // Garante que o registro existe na tabela pública
      await admin.from('users').upsert({
        id: userId,
        email: payerEmail,
        plan: 'free',
        credits: 0,
      }, { onConflict: 'id', ignoreDuplicates: true })
    } else {
      // Usuário já existe — busca pelo email via tabela pública
      const { data: existingRow } = await admin.from('users').select('id').eq('email', payerEmail).single()
      if (existingRow) userId = existingRow.id
      console.log('[checkout/process] usuário já existe:', payerEmail)
    }
  }

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
          userId: userId ?? 'guest',
          credits: plan.credits,
          email: payerEmail,
        },
        payer: {
          ...formData.payer,
          email: payerEmail,
        },
      },
    })

    console.log(`[checkout/process] payment id=${result.id} status=${result.status} plan=${planId} user=${userId}`)

    if (result.status === 'approved' && userId) {
      if (planId === 'subscription') {
        await admin.from('users')
          .update({ plan: 'subscription', credits: plan.credits })
          .eq('id', userId)
      } else {
        await admin.rpc('add_credits', { user_id_param: userId, amount: plan.credits })
        if (planId === 'package') {
          await admin.from('users').update({ plan: 'package' }).eq('id', userId)
        }
      }

      await admin.from('orders').insert({
        user_id:   userId,
        type:      planId === 'perPhoto' ? 'per_photo' : planId === 'subscription' ? 'subscription' : 'package',
        stripe_id: String(result.id),
        amount:    Math.round(plan.price * 100),
        status:    'paid',
      })
    }

    // Para convidados aprovados, gera link de acesso automático ao dashboard
    let dashboardLink: string | null = null
    if (result.status === 'approved' && isGuest && userId) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL!
      const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent('/dashboard?success=1&plan=' + planId)}`
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: payerEmail,
        options: { redirectTo },
      })
      dashboardLink = linkData?.properties?.action_link ?? null
    }

    return NextResponse.json({
      status:        result.status,
      payment_id:    result.id,
      email:         payerEmail,
      dashboardLink,
    })

  } catch (err: any) {
    console.error('[checkout/process] error:', err.message)
    return NextResponse.json({ error: err.message ?? 'Erro ao processar pagamento' }, { status: 500 })
  }
}
