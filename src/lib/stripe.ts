import Stripe from 'stripe'

// Lazy initialization — avoids crash during build when env vars aren't set
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY não configurada')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    })
  }
  return _stripe
}

export const PLANS = {
  perPhoto: {
    name: 'Pay-per-foto',
    price: 1900,
    priceId: process.env.STRIPE_PRICE_PER_PHOTO ?? '',
    credits: 1,
  },
  subscription: {
    name: 'Assinatura Mensal',
    price: 5900,
    priceId: process.env.STRIPE_PRICE_SUBSCRIPTION ?? '',
    credits: 10,
  },
  package: {
    name: 'Pacote 10 Créditos',
    price: 12900,
    priceId: process.env.STRIPE_PRICE_PACKAGE ?? '',
    credits: 10,
  },
} as const

export type PlanType = keyof typeof PLANS
