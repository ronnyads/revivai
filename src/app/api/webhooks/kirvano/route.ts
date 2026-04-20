export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPurchaseEmail, sendRefundEmail, sendAbandonedCartEmail } from '@/lib/email'
import { isDisposableEmail } from '@/lib/disposableEmails'

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/webhooks/kirvano
   Eventos: SALE_APPROVED | SALE_REFUNDED | ABANDONED_CART
   Header: X-Kirvano-Token (validado contra KIRVANO_WEBHOOK_TOKEN)
───────────────────────────────────────────────────────────────────────────── */

const KIRVANO_PRODUCTS: Record<string, { planId: string; credits: number; name: string; price: number }> = {
  // Explorador (free)
  [process.env.KIRVANO_PRODUCT_FREE    ?? '8be0d9b0-c20d-471e-9988-0c5b1951c3b1']: { planId: 'free',    credits: 50,   name: 'Explorador', price: 0   },
  // Rookie
  [process.env.KIRVANO_PRODUCT_STARTER ?? '742d82bb-2ce1-4db6-88e6-f7da3a56897d']: { planId: 'starter', credits: 600,  name: 'Rookie',     price: 47  },
  // Creator
  [process.env.KIRVANO_PRODUCT_POPULAR ?? '643c2622-c454-4dc5-a85e-da2276b7d944']: { planId: 'popular', credits: 1100, name: 'Creator',    price: 79  },
  // Pro
  [process.env.KIRVANO_PRODUCT_PRO     ?? '781f1a63-1608-4fcf-be7c-cc1cf1680348']: { planId: 'pro',     credits: 2100, name: 'Pro',        price: 149 },
  // Studio
  [process.env.KIRVANO_PRODUCT_AGENCY  ?? 'bb19dade-47d9-4801-ac48-8a4b05bd4367']: { planId: 'agency',  credits: 5100, name: 'Studio',     price: 397 },
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

    // Camada 1 — bloqueia e-mails descartáveis
    if (isDisposableEmail(email)) {
      console.warn(`[kirvano] E-mail descartável bloqueado: ${email}`)
      return NextResponse.json({ ok: true })
    }

    // Identifica plano pelo primeiro produto
    const productId = body.products?.[0]?.id ?? body.product?.id ?? ''
    const offerName: string = (body.products?.[0]?.offer?.name ?? body.offer?.name ?? '').toLowerCase()
    const offerPrice: number = body.products?.[0]?.offer?.price ?? body.offer?.price ?? 0

    // Fallback: mapeia por nome da oferta ou preço quando ID não está configurado
    let plan = KIRVANO_PRODUCTS[productId]
    if (!plan) {
      if (offerName.includes('explorador') || offerName.includes('free') || offerName.includes('gratuito') || offerPrice === 0)
        plan = { planId: 'free',    credits: 50,   name: 'Explorador', price: 0   }
      else if (offerName.includes('rookie') || offerName.includes('starter') || (offerPrice >= 4700 && offerPrice < 7900))
        plan = { planId: 'starter', credits: 600,  name: 'Rookie',  price: 47  }
      else if (offerName.includes('creator') || offerName.includes('popular') || (offerPrice >= 7900 && offerPrice < 14900))
        plan = { planId: 'popular', credits: 1100, name: 'Creator', price: 79  }
      else if (offerName.includes(' pro') || (offerPrice >= 14900 && offerPrice < 39700))
        plan = { planId: 'pro',     credits: 2100, name: 'Pro',     price: 149 }
      else if (offerName.includes('studio') || offerName.includes('agency') || offerPrice >= 39700)
        plan = { planId: 'agency',  credits: 5100, name: 'Studio',  price: 397 }
    }

    if (!plan) {
      console.warn(`[kirvano] Produto não mapeado: ${productId} | oferta: "${offerName}" | preço: ${offerPrice} | payload: ${JSON.stringify(body).slice(0, 800)}`)
      return NextResponse.json({ ok: true })
    }
    console.log(`[kirvano] Produto mapeado: ${productId} → ${plan.name}`)

    // Camada 2 — deduplicação por CPF para plano free
    const cpf = (body.customer?.document ?? body.customer?.cpf ?? '').replace(/\D/g, '')
    if (plan.planId === 'free' && cpf) {
      const { data: existingOrder } = await admin
        .from('orders')
        .select('id')
        .eq('type', 'free')
        .eq('provider', 'kirvano')
        .like('external_id', `%${cpf.slice(0, 6)}%`)
        .maybeSingle()

      if (existingOrder) {
        console.warn(`[kirvano] CPF já usou plano free: ${cpf.slice(0, 3)}***. Bloqueado.`)
        return NextResponse.json({ ok: true })
      }
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

    // Salva pedido (CPF parcialmente mascarado no external_id para deduplicação)
    const externalId = cpf
      ? `${body.sale_id ?? body.id ?? 'kirvano'}|cpf:${cpf.slice(0, 6)}***`
      : (body.sale_id ?? body.id ?? null)
    await admin.from('orders').insert({
      user_id: userId,
      type: plan.planId,
      amount: plan.price * 100,
      status: 'paid',
      provider: 'kirvano',
      external_id: externalId,
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
