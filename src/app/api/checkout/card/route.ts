export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Payment } from 'mercadopago'
import { getMPClient, getPlans, type PlanType } from '@/lib/mercadopago'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await req.json()
    const { planId, email: bodyEmail, cpf, token, brand, name } = body as {
      planId: PlanType; email: string; cpf: string; token: string; brand: string; name: string
    }

    const plans = await getPlans()
    const plan = plans[planId]
    if (!plan) return NextResponse.json({ success: false, error: 'Plano inválido' }, { status: 400 })
    if (!token) return NextResponse.json({ success: false, error: 'Token de cartão ausente' }, { status: 400 })

    const payerEmail = user?.email || bodyEmail
    if (!payerEmail) return NextResponse.json({ success: false, error: 'E-mail inválido' }, { status: 400 })
    if (!cpf || cpf.replace(/\D/g, '').length < 11) return NextResponse.json({ success: false, error: 'CPF inválido' }, { status: 400 })

    const admin = createAdminClient()
    let userId = user?.id
    let isGuest = !user

    if (!user) {
      const { data: newUser, error } = await admin.auth.admin.createUser({ email: payerEmail, email_confirm: true })
      if (!error && newUser.user) {
        userId = newUser.user.id
        await admin.from('users').upsert({ id: userId, email: payerEmail, plan: 'free', credits: 0 }, { onConflict: 'id', ignoreDuplicates: true })
      } else {
        const { data: existing } = await admin.from('users').select('id').eq('email', payerEmail).single()
        if (existing) { userId = existing.id; isGuest = false }
      }
    }

    const cleanDoc = cpf.replace(/\D/g, '')
    const nameParts = (name || 'Cliente').trim().split(' ')

    const client = getMPClient()
    const payment = new Payment(client)

    const result = await payment.create({
      body: {
        transaction_amount: plan.price,
        token,
        description: `reviv.ai — ${plan.name}`,
        installments: 1,
        payment_method_id: brand,
        payer: {
          email: payerEmail,
          first_name: nameParts[0],
          last_name: nameParts.slice(1).join(' ') || 'Cliente',
          identification: { type: 'CPF', number: cleanDoc },
        },
        metadata: { planId, userId: userId ?? '', credits: plan.credits },
      },
    })

    console.log(`[checkout/card] id=${result.id} status=${result.status} plan=${planId}`)

    if (result.status === 'approved' && userId) {
      if (planId === 'subscription') {
        await admin.from('users').update({ plan: 'subscription', credits: plan.credits }).eq('id', userId)
      } else {
        await admin.rpc('add_credits', { user_id_param: userId, amount: plan.credits })
        if (planId === 'package') await admin.from('users').update({ plan: 'package' }).eq('id', userId)
      }
      await admin.from('orders').insert({
        user_id: userId,
        type: planId === 'perPhoto' ? 'per_photo' : planId === 'subscription' ? 'subscription' : 'package',
        stripe_id: String(result.id),
        amount: Math.round(plan.price * 100),
        status: 'paid',
      })
    }

    if (result.status !== 'approved' && result.status !== 'in_process') {
      return NextResponse.json({ success: false, error: 'Pagamento recusado pela operadora', status: result.status }, { status: 400 })
    }

    // Gera link de acesso automático para convidados
    let dashboardLink: string | null = null
    if (result.status === 'approved' && isGuest && userId) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL!
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: payerEmail,
        options: { redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent('/dashboard?success=1&plan=' + planId)}` },
      })
      dashboardLink = linkData?.properties?.action_link ?? null
    }

    return NextResponse.json({ success: true, status: result.status, dashboardLink })
  } catch (err: any) {
    console.error('[checkout/card]', err.message)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
