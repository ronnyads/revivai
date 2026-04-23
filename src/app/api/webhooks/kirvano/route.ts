export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPurchaseEmail, sendRefundEmail, sendAbandonedCartEmail } from '@/lib/email'
import { isDisposableEmail } from '@/lib/disposableEmails'

type KirvanoPlan = {
  productPlanId: string
  accountPlan: 'free' | 'package'
  orderType: 'free' | 'package'
  credits: number
  name: string
  price: number
}

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}

function asRecordArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : []
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

const KIRVANO_PRODUCTS: Record<string, KirvanoPlan> = {
  [process.env.KIRVANO_PRODUCT_FREE ?? '8be0d9b0-c20d-471e-9988-0c5b1951c3b1']: {
    productPlanId: 'free',
    accountPlan: 'free',
    orderType: 'free',
    credits: 50,
    name: 'Explorador',
    price: 0,
  },
  [process.env.KIRVANO_PRODUCT_STARTER ?? '742d82bb-2ce1-4db6-88e6-f7da3a56897d']: {
    productPlanId: 'starter',
    accountPlan: 'package',
    orderType: 'package',
    credits: 600,
    name: 'Rookie',
    price: 47,
  },
  [process.env.KIRVANO_PRODUCT_POPULAR ?? '643c2622-c454-4dc5-a85e-da2276b7d944']: {
    productPlanId: 'popular',
    accountPlan: 'package',
    orderType: 'package',
    credits: 1100,
    name: 'Creator',
    price: 79,
  },
  [process.env.KIRVANO_PRODUCT_PRO ?? '781f1a63-1608-4fcf-be7c-cc1cf1680348']: {
    productPlanId: 'pro',
    accountPlan: 'package',
    orderType: 'package',
    credits: 2100,
    name: 'Pro',
    price: 149,
  },
  [process.env.KIRVANO_PRODUCT_AGENCY ?? 'bb19dade-47d9-4801-ac48-8a4b05bd4367']: {
    productPlanId: 'agency',
    accountPlan: 'package',
    orderType: 'package',
    credits: 5100,
    name: 'Studio',
    price: 397,
  },
}

function normalizePriceCents(value: unknown) {
  const price = Number(value ?? 0)
  if (!Number.isFinite(price) || price <= 0) return 0
  return price < 1000 ? Math.round(price * 100) : Math.round(price)
}

function planFromFallback(offerName: string, offerPrice: number): KirvanoPlan | undefined {
  if (offerName.includes('explorador') || offerName.includes('free') || offerName.includes('gratuito') || offerPrice === 0) {
    return { productPlanId: 'free', accountPlan: 'free', orderType: 'free', credits: 50, name: 'Explorador', price: 0 }
  }
  if (offerName.includes('rookie') || offerName.includes('starter') || (offerPrice >= 4700 && offerPrice < 7900)) {
    return { productPlanId: 'starter', accountPlan: 'package', orderType: 'package', credits: 600, name: 'Rookie', price: 47 }
  }
  if (offerName.includes('creator') || offerName.includes('popular') || (offerPrice >= 7900 && offerPrice < 14900)) {
    return { productPlanId: 'popular', accountPlan: 'package', orderType: 'package', credits: 1100, name: 'Creator', price: 79 }
  }
  if (offerName.includes(' pro') || offerName === 'pro' || (offerPrice >= 14900 && offerPrice < 39700)) {
    return { productPlanId: 'pro', accountPlan: 'package', orderType: 'package', credits: 2100, name: 'Pro', price: 149 }
  }
  if (offerName.includes('studio') || offerName.includes('agency') || offerPrice >= 39700) {
    return { productPlanId: 'agency', accountPlan: 'package', orderType: 'package', credits: 5100, name: 'Studio', price: 397 }
  }
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-kirvano-token') ?? req.headers.get('authorization')
  if (process.env.KIRVANO_WEBHOOK_TOKEN && token !== process.env.KIRVANO_WEBHOOK_TOKEN) {
    console.warn('[kirvano] Token invalido')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: JsonRecord
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body invalido' }, { status: 400 })
  }

  const event = asString(body.event ?? body.event_type ?? body.type).toUpperCase()
  console.log(`[kirvano] Evento recebido: ${event}`)

  const admin = createAdminClient()

  if (event === 'SALE_APPROVED') {
    const customer = asRecord(body.customer)
    const firstProduct = asRecordArray(body.products)[0] ?? {}
    const product = asRecord(body.product)
    const offer = asRecord(body.offer)
    const productOffer = asRecord(firstProduct.offer)
    const planPayload = asRecord(body.plan)
    const email = asString(customer.email)
    const name = asString(customer.name ?? customer.full_name) || email.split('@')[0]

    if (!email) {
      console.warn('[kirvano] SALE_APPROVED sem e-mail do cliente')
      return NextResponse.json({ ok: true })
    }

    if (isDisposableEmail(email)) {
      console.warn(`[kirvano] E-mail descartavel bloqueado: ${email}`)
      return NextResponse.json({ ok: true })
    }

    const productId = asString(firstProduct.id ?? product.id ?? body.product_id ?? body.productId)
    const offerName = String(
      productOffer.name ??
      firstProduct.name ??
      product.name ??
      offer.name ??
      planPayload.name ??
      ''
    ).toLowerCase()
    const offerPrice = normalizePriceCents(
      productOffer.price ??
      offer.price ??
      body.price ??
      body.amount
    )

    const plan = KIRVANO_PRODUCTS[productId] ?? planFromFallback(offerName, offerPrice)

    if (!plan) {
      console.warn(`[kirvano] Produto nao mapeado: ${productId} | oferta: "${offerName}" | preco: ${offerPrice} | payload: ${JSON.stringify(body).slice(0, 800)}`)
      return NextResponse.json({ ok: true })
    }
    console.log(`[kirvano] Produto mapeado: ${productId} -> ${plan.name} (${plan.productPlanId})`)

    const cpf = asString(customer.document ?? customer.cpf).replace(/\D/g, '')
    if (plan.productPlanId === 'free' && cpf) {
      const { data: existingOrder } = await admin
        .from('orders')
        .select('id')
        .eq('type', 'free')
        .like('stripe_id', `%${cpf.slice(0, 6)}%`)
        .maybeSingle()

      if (existingOrder) {
        console.warn(`[kirvano] CPF ja usou plano free: ${cpf.slice(0, 3)}***. Bloqueado.`)
        return NextResponse.json({ ok: true })
      }
    }

    let userId: string
    const { data: existingUser } = await admin.auth.admin.listUsers()
    const found = existingUser?.users?.find((u) => u.email === email)

    if (found) {
      userId = found.id
    } else {
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: '123456',
        email_confirm: true,
      })
      if (createErr || !newUser?.user) {
        console.error('[kirvano] Falha ao criar usuario:', createErr?.message)
        return NextResponse.json({ error: 'Falha ao criar usuario' }, { status: 500 })
      }
      userId = newUser.user.id
    }

    const { error: upsertErr } = await admin.from('users').upsert({
      id: userId,
      email,
      plan: plan.accountPlan,
    }, { onConflict: 'id', ignoreDuplicates: false })
    if (upsertErr) {
      console.error('[kirvano] Falha ao atualizar usuario:', upsertErr.message)
      return NextResponse.json({ error: 'Falha ao atualizar usuario' }, { status: 500 })
    }

    const { error: creditsErr } = await admin.rpc('add_credits', { user_id_param: userId, amount: plan.credits })
    if (creditsErr) {
      console.warn('[kirvano] add_credits falhou:', creditsErr.message)
      const { data: currentUser } = await admin.from('users').select('credits').eq('id', userId).single()
      const newCredits = (currentUser?.credits ?? 0) + plan.credits
      const { error: fallbackCreditsErr } = await admin.from('users').update({ credits: newCredits }).eq('id', userId)
      if (fallbackCreditsErr) console.warn('[kirvano] update credits falhou:', fallbackCreditsErr.message)
      else console.log(`[kirvano] Creditos adicionados por fallback: ${plan.credits} -> total: ${newCredits}`)
    } else {
      console.log(`[kirvano] Creditos adicionados: ${plan.credits}`)
    }

    const externalId = cpf
      ? `${body.sale_id ?? body.id ?? 'kirvano'}|cpf:${cpf.slice(0, 6)}***`
      : asString(body.sale_id ?? body.id) || `kirvano-${Date.now()}`
    const { error: orderErr } = await admin.from('orders').insert({
      user_id: userId,
      type: plan.orderType,
      amount: plan.price * 100,
      status: 'paid',
      stripe_id: externalId,
    })
    if (orderErr) console.warn('[kirvano] pedido nao salvo:', orderErr.message)

    const loginUrl = 'https://revivads.com/auth/login'
    const { error: emailErr } = await sendPurchaseEmail({
      email,
      name,
      planName: plan.name,
      credits: plan.credits,
      password: '123456',
      loginUrl,
    })
    if (emailErr) console.warn('[kirvano] E-mail de compra falhou:', emailErr)
    else console.log(`[kirvano] E-mail enviado para ${email} - Plano ${plan.name}`)

    return NextResponse.json({ ok: true })
  }

  if (event === 'SALE_REFUNDED') {
    const customer = asRecord(body.customer)
    const firstProduct = asRecordArray(body.products)[0] ?? {}
    const product = asRecord(body.product)
    const email = asString(customer.email)
    const name = asString(customer.name ?? customer.full_name)
    const productId = asString(firstProduct.id ?? product.id)
    const plan = KIRVANO_PRODUCTS[productId]

    if (email) {
      await sendRefundEmail({ email, name, planName: plan?.name ?? 'RevivAI' })
      console.log(`[kirvano] Reembolso notificado: ${email}`)
    }

    return NextResponse.json({ ok: true })
  }

  if (event === 'ABANDONED_CART') {
    const customer = asRecord(body.customer ?? body.lead)
    const firstProduct = asRecordArray(body.products)[0] ?? {}
    const product = asRecord(body.product)
    const offer = asRecord(body.offer)
    const productOffer = asRecord(firstProduct.offer)
    const email = asString(customer.email)
    const name = asString(customer.name ?? customer.full_name)
    const productId = asString(firstProduct.id ?? product.id)
    const offerName = asString(productOffer.name ?? firstProduct.name ?? product.name ?? offer.name).toLowerCase()
    const offerPrice = normalizePriceCents(productOffer.price ?? offer.price ?? body.price ?? body.amount)
    const plan = KIRVANO_PRODUCTS[productId] ?? planFromFallback(offerName, offerPrice)

    if (email && plan) {
      const checkoutUrl = asString(body.checkout_url) || `${process.env.NEXT_PUBLIC_APP_URL}/#precos`
      await sendAbandonedCartEmail({
        email,
        name,
        planName: plan.name,
        credits: plan.credits,
        price: plan.price,
        checkoutUrl,
      })
      console.log(`[kirvano] Carrinho abandonado notificado: ${email}`)
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}
