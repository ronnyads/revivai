export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { PLANS } from '@/lib/mercadopago'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const xSignature = req.headers.get('x-signature') ?? ''
  const xRequestId = req.headers.get('x-request-id') ?? ''
  const url = new URL(req.url)
  const dataId = url.searchParams.get('data.id') ?? ''

  // Validate MP signature
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET ?? ''
  if (secret) {
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${xSignature.split(',').find(p => p.startsWith('ts='))?.split('=')[1] ?? ''};`
    const v1 = xSignature.split(',').find(p => p.startsWith('v1='))?.split('=')[1] ?? ''
    const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
    if (hash !== v1) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  }

  const notification = JSON.parse(body)
  const supabase = await createClient()

  // MP envia tipo "payment"
  if (notification.type === 'payment') {
    const paymentId = notification.data?.id
    if (!paymentId) return NextResponse.json({ ok: true })

    // Buscar detalhes do pagamento via API MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    })
    const payment = await mpRes.json()

    if (payment.status !== 'approved') return NextResponse.json({ ok: true })

    const { planId, userId, credits } = payment.metadata ?? {}
    if (!userId || !planId) return NextResponse.json({ ok: true })

    const plan = PLANS[planId as keyof typeof PLANS]

    // Adicionar créditos / atualizar plano
    if (planId === 'subscription') {
      await supabase.from('users')
        .update({ plan: 'subscription', credits: plan.credits })
        .eq('id', userId)
    } else {
      await supabase.rpc('add_credits', { user_id_param: userId, amount: plan.credits })
      if (planId === 'package') {
        await supabase.from('users').update({ plan: 'package' }).eq('id', userId)
      }
    }

    // Registrar pedido
    await supabase.from('orders').insert({
      user_id:   userId,
      type:      planId === 'perPhoto' ? 'per_photo' : planId === 'subscription' ? 'subscription' : 'package',
      stripe_id: String(paymentId), // reusing field for MP payment ID
      amount:    Math.round(payment.transaction_amount * 100), // em centavos
      status:    'paid',
    })
  }

  return NextResponse.json({ ok: true })
}
