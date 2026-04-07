export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getMPClient, PLANS, type PlanType } from '@/lib/mercadopago'
import { Preference } from 'mercadopago'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { planId } = await req.json() as { planId: PlanType }
  const plan = PLANS[planId]
  if (!plan) return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const client = getMPClient()

  const preference = new Preference(client)

  const body = {
    items: [
      {
        id: planId,
        title: `reviv.ai — ${plan.name}`,
        description: plan.description,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: plan.price,
      },
    ],
    payer: user?.email ? { email: user.email } : undefined,
    back_urls: {
      success: `${appUrl}/dashboard?success=1&plan=${planId}`,
      failure: `${appUrl}/#pricing?error=1`,
      pending: `${appUrl}/dashboard?pending=1`,
    },
    auto_return: 'approved' as const,
    notification_url: `${appUrl}/api/webhooks/mercadopago`,
    metadata: {
      planId,
      userId: user?.id ?? '',
      credits: plan.credits,
    },
    payment_methods: {
      // Aceita todos: PIX, cartão, boleto
      excluded_payment_types: [],
      installments: planId === 'perPhoto' ? 1 : 12,
    },
    expires: false,
    statement_descriptor: 'REVIV.AI',
  }

  const response = await preference.create({ body })

  // Sandbox: sandbox_init_point | Produção: init_point
  const checkoutUrl = process.env.NODE_ENV === 'production'
    ? response.init_point
    : response.sandbox_init_point

  return NextResponse.json({ url: checkoutUrl, preferenceId: response.id })
}
