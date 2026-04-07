export const dynamic = 'force-dynamic'

import { getStripe, PLANS } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature')!

  const stripe = getStripe()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { planId, userId } = session.metadata ?? {}
    if (!userId || !planId) return NextResponse.json({ ok: true })

    const plan = PLANS[planId as keyof typeof PLANS]

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

    await supabase.from('orders').insert({
      user_id:   userId,
      type:      planId === 'perPhoto' ? 'per_photo' : planId === 'subscription' ? 'subscription' : 'package',
      stripe_id: session.id,
      amount:    session.amount_total ?? 0,
      status:    'paid',
    })
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub    = event.data.object as Stripe.Subscription
    const custId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
    await supabase.from('users')
      .update({ plan: 'free', credits: 0 })
      .eq('stripe_customer_id', custId)
  }

  return NextResponse.json({ ok: true })
}
