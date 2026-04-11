export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlans, type PlanType } from '@/lib/mercadopago'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const paymentId = searchParams.get('id')
  if (!paymentId) return NextResponse.json({ status: 'unknown' })

  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    cache: 'no-store',
  })
  const payment = await mpRes.json()

  if (payment.status === 'approved') {
    const { planId, userId, credits, email, isGuest } = payment.metadata ?? {}

    if (userId && planId) {
      const plans = await getPlans()
      const plan = plans[planId as PlanType]
      const admin = createAdminClient()

      if (planId === 'subscription') {
        await admin.from('users').update({ plan: 'subscription', credits: plan.credits }).eq('id', userId)
      } else {
        await admin.rpc('add_credits', { user_id_param: userId, amount: plan.credits })
        if (planId === 'package') await admin.from('users').update({ plan: 'package' }).eq('id', userId)
      }

      try {
        await admin.from('orders').update({ status: 'paid' }).eq('stripe_id', String(paymentId))
      } catch (e) { console.error('[status] update order:', e) }

      // Gera link de acesso para convidados
      let dashboardLink: string | null = null
      if (isGuest && email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL!
        const { data: linkData } = await admin.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: { redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent('/dashboard?success=1&plan=' + planId)}` },
        })
        dashboardLink = linkData?.properties?.action_link ?? null
      }

      return NextResponse.json({ status: 'approved', dashboardLink })
    }
  }

  return NextResponse.json({ status: payment.status })
}
