export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPurchaseEmail, sendRefundEmail, sendAbandonedCartEmail } from '@/lib/email'

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/webhooks/kirvano
   Eventos: SALE_APPROVED | SALE_REFUNDED | ABANDONED_CART
   Header: X-Kirvano-Token (validado contra KIRVANO_WEBHOOK_TOKEN)
───────────────────────────────────────────────────────────────────────────── */

// Preencher após criar produtos no painel Kirvano
const KIRVANO_PRODUCTS: Record<string, { planId: string; credits: number; name: string; price: number }> = {
  [process.env.KIRVANO_PRODUCT_STARTER ?? 'PRODUCT_ID_STARTER']: { planId: 'starter', credits: 600,  name: 'Rookie',  price: 47  },
  [process.env.KIRVANO_PRODUCT_POPULAR ?? 'PRODUCT_ID_POPULAR']: { planId: 'popular', credits: 1100, name: 'Creator', price: 79  },
  [process.env.KIRVANO_PRODUCT_PRO     ?? 'PRODUCT_ID_PRO']:     { planId: 'pro',     credits: 2100, name: 'Pro',     price: 149 },
  [process.env.KIRVANO_PRODUCT_AGENCY  ?? 'PRODUCT_ID_AGENCY']:  { planId: 'agency',  credits: 5100, name: 'Studio',  price: 397 },
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = req.headers.get('x-kirvano-token') ?? req.headers.get('authorization')
  if (process.env.KIRVANO_WEBHOOK_TOKEN && token !== process.env.KIRVANO_WEBHOOK_TOKEN) {
    console.warn('[kirvano] Token inválido')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const event = body.event as string
  console.log(`[kirvano] Evento recebido: ${event}`)

  const admin = createAdminClient()

  // ── SALE_APPROVED ─────────────────────────────────────────────────────────
  if (event === 'SALE_APPROVED') {
    const customer = body.customer ?? {}
    const email: string = customer.email ?? ''
    const name: string  = customer.name  ?? customer.full_name ?? email.split('@')[0]

    if (!email) {
      console.warn('[kirvano] SALE_APPROVED sem e-mail do cliente')
      return NextResponse.json({ ok: true })
    }

    // Identifica plano pelo primeiro produto
    const productId = body.products?.[0]?.id ?? body.product?.id ?? ''
    const plan = KIRVANO_PRODUCTS[productId]
    if (!plan) {
      console.warn(`[kirvano] Produto não mapeado: ${productId}`)
      return NextResponse.json({ ok: true })
    }

    // Cria ou recupera usuário no Supabase
    let userId: string
    const { data: existingUser } = await admin.auth.admin.listUsers()
    const found = existingUser?.users?.find(u => u.email === email)

    if (found) {
      userId = found.id
    } else {
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      })
      if (createErr || !newUser?.user) {
        console.error('[kirvano] Falha ao criar usuário:', createErr?.message)
        return NextResponse.json({ error: 'Falha ao criar usuário' }, { status: 500 })
      }
      userId = newUser.user.id
    }

    // Upsert na tabela users
    await admin.from('users').upsert({
      id: userId,
      email,
      plan: plan.planId,
    }, { onConflict: 'id', ignoreDuplicates: false })

    // Adiciona créditos
    const { error: creditsErr } = await admin.rpc('add_credits', {
      user_id: userId,
      amount: plan.credits,
    })
    if (creditsErr) console.warn('[kirvano] add_credits falhou:', creditsErr.message)

    // Salva pedido
    await admin.from('orders').insert({
      user_id: userId,
      type: plan.planId,
      amount: plan.price * 100,
      status: 'paid',
      provider: 'kirvano',
      external_id: body.sale_id ?? body.id ?? null,
    }).select()

    // Gera magic link para primeiro acesso
    let magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/login`
    try {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard` },
      })
      if (linkData?.properties?.action_link) {
        magicLink = linkData.properties.action_link
      }
    } catch (e) {
      console.warn('[kirvano] Falha ao gerar magic link:', e)
    }

    // Envia e-mail de boas-vindas
    const { error: emailErr } = await sendPurchaseEmail({
      email,
      name,
      planName: plan.name,
      credits: plan.credits,
      magicLink,
    })
    if (emailErr) console.warn('[kirvano] E-mail de compra falhou:', emailErr)
    else console.log(`[kirvano] ✅ E-mail enviado para ${email} — Plano ${plan.name}`)

    return NextResponse.json({ ok: true })
  }

  // ── SALE_REFUNDED ─────────────────────────────────────────────────────────
  if (event === 'SALE_REFUNDED') {
    const customer = body.customer ?? {}
    const email: string = customer.email ?? ''
    const name: string  = customer.name ?? customer.full_name ?? ''
    const productId = body.products?.[0]?.id ?? body.product?.id ?? ''
    const plan = KIRVANO_PRODUCTS[productId]

    if (email) {
      await sendRefundEmail({ email, name, planName: plan?.name ?? 'RevivAI' })
      console.log(`[kirvano] ↩ Reembolso notificado: ${email}`)
    }

    return NextResponse.json({ ok: true })
  }

  // ── ABANDONED_CART ────────────────────────────────────────────────────────
  if (event === 'ABANDONED_CART') {
    const customer = body.customer ?? body.lead ?? {}
    const email: string = customer.email ?? ''
    const name: string  = customer.name ?? customer.full_name ?? ''
    const productId = body.products?.[0]?.id ?? body.product?.id ?? ''
    const plan = KIRVANO_PRODUCTS[productId]

    if (email && plan) {
      const checkoutUrl = body.checkout_url ?? `${process.env.NEXT_PUBLIC_APP_URL}/#precos`
      await sendAbandonedCartEmail({
        email,
        name,
        planName: plan.name,
        credits: plan.credits,
        price: plan.price,
        checkoutUrl,
      })
      console.log(`[kirvano] 🛒 Carrinho abandonado notificado: ${email}`)
    }

    return NextResponse.json({ ok: true })
  }

  // Ignora eventos desconhecidos
  return NextResponse.json({ ok: true })
}
