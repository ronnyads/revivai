export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getStripe, PLANS, type PlanType } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { planId } = await req.json() as { planId: PlanType }
  const plan = PLANS[planId]
  if (!plan) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  let customerId: string | undefined
  if (user) {
    const { data: profile } = await supabase
      .from('users').select('stripe_customer_id').eq('id', user.id).single()
    customerId = profile?.stripe_customer_id ?? undefined

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: { supabase_id: user.id },
      })
      customerId = customer.id
      await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: planId === 'subscription' ? 'subscription' : 'payment',
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?success=1&plan=${planId}`,
    cancel_url: `${appUrl}/#pricing`,
    metadata: { planId, userId: user?.id ?? '' },
    allow_promotion_codes: true,
    locale: 'pt-BR',
  })

  return NextResponse.json({ url: session.url })
}
