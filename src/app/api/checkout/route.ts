export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMPClient, PLANS, type PlanType } from '@/lib/mercadopago'
import { Preference } from 'mercadopago'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { planId, email: guestEmail } = await req.json() as { planId: PlanType; email?: string }
  const plan = PLANS[planId]
  if (!plan) return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const admin = createAdminClient()

  let userId = user?.id
  let userEmail = user?.email || guestEmail

  // Se não está logado, cria conta com o email fornecido
  if (!user && guestEmail) {
    const { data: newUser, error } = await admin.auth.admin.createUser({
      email: guestEmail,
      email_confirm: true,
    })

    if (!error && newUser.user) {
      userId = newUser.user.id
      userEmail = guestEmail
      await admin.from('users').upsert(
        { id: userId, email: guestEmail, plan: 'free', credits: 0 },
        { onConflict: 'id', ignoreDuplicates: true }
      )
    } else {
      // Usuário já existe — busca pelo email
      const { data: existing } = await admin.from('users').select('id').eq('email', guestEmail).single()
      if (existing) userId = existing.id
    }
  }

  // back_url condicional: convidado vai para /checkout/complete para fazer login automático
  const isGuest = !user && !!userId
  const successUrl = isGuest
    ? `${appUrl}/checkout/complete?plan=${planId}`
    : `${appUrl}/dashboard?success=1&plan=${planId}`

  const client = getMPClient()
  const preference = new Preference(client)

  const response = await preference.create({
    body: {
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
      payer: userEmail ? { email: userEmail } : undefined,
      external_reference: userId ?? '',
      back_urls: {
        success: successUrl,
        failure: `${appUrl}/#pricing`,
        pending: `${appUrl}/dashboard?pending=1`,
      },
      auto_return: 'approved' as const,
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
      metadata: {
        planId,
        userId: userId ?? '',
        credits: plan.credits,
        email: userEmail,
      },
      payment_methods: {
        excluded_payment_types: [],
        installments: planId === 'perPhoto' ? 1 : 12,
      },
      expires: false,
      statement_descriptor: 'REVIV.AI',
    },
  })

  const url = process.env.NODE_ENV === 'production'
    ? response.init_point
    : response.sandbox_init_point

  return NextResponse.json({ url, isGuest })
}
