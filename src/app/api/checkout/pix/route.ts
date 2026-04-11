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
    const { planId, email: bodyEmail, cpf } = body as { planId: PlanType; email: string; cpf: string }

    const plans = await getPlans()
    const plan = plans[planId]
    if (!plan) return NextResponse.json({ success: false, error: 'Plano inválido' }, { status: 400 })

    const payerEmail = user?.email || bodyEmail
    if (!payerEmail) return NextResponse.json({ success: false, error: 'E-mail inválido' }, { status: 400 })
    if (!cpf || cpf.replace(/\D/g, '').length < 11) return NextResponse.json({ success: false, error: 'CPF inválido' }, { status: 400 })

    // Ler desconto PIX do DB (fallback 5%)
    const admin = createAdminClient()
    let pixDiscountPct = 5
    try {
      const { data: setting } = await admin.from('settings').select('value').eq('key', 'pix_discount').single()
      if (setting?.value) pixDiscountPct = parseFloat(setting.value) || 5
    } catch {}
    const PIX_DISCOUNT = 1 - pixDiscountPct / 100

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
    const amount = Math.round(plan.price * PIX_DISCOUNT * 100) / 100

    const client = getMPClient()
    const payment = new Payment(client)

    const result = await payment.create({
      body: {
        transaction_amount: amount,
        description: `reviv.ai — ${plan.name}`,
        payment_method_id: 'pix',
        payer: {
          email: payerEmail,
          identification: { type: 'CPF', number: cleanDoc },
        },
        metadata: { planId, userId: userId ?? '', credits: plan.credits, email: payerEmail, isGuest },
      },
    })

    console.log(`[checkout/pix] id=${result.id} status=${result.status} plan=${planId}`)

    if (result.status !== 'pending' || !result.point_of_interaction) {
      return NextResponse.json({ success: false, error: 'Falha ao gerar PIX' }, { status: 400 })
    }

    // Salva pedido pendente
    if (userId) {
      try {
        await admin.from('orders').insert({
          user_id: userId,
          type: planId === 'perPhoto' ? 'per_photo' : planId === 'subscription' ? 'subscription' : 'package',
          stripe_id: String(result.id),
          amount: Math.round(amount * 100),
          status: 'pending',
        })
      } catch (saveErr) { console.error('[checkout/pix] save order:', saveErr) }
    }

    return NextResponse.json({
      success: true,
      qrCode: result.point_of_interaction.transaction_data?.qr_code,
      qrCodeBase64: result.point_of_interaction.transaction_data?.qr_code_base64,
      paymentId: result.id,
    })
  } catch (err: any) {
    console.error('[checkout/pix]', err.message)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
