import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

export const PLANS = {
  perPhoto: {
    name: 'Pay-per-foto',
    price: 1900, // R$19 em centavos
    priceId: process.env.STRIPE_PRICE_PER_PHOTO!,
    credits: 1,
  },
  subscription: {
    name: 'Assinatura Mensal',
    price: 5900, // R$59
    priceId: process.env.STRIPE_PRICE_SUBSCRIPTION!,
    credits: 10,
  },
  package: {
    name: 'Pacote 10 Créditos',
    price: 12900, // R$129
    priceId: process.env.STRIPE_PRICE_PACKAGE!,
    credits: 10,
  },
} as const

export type PlanType = keyof typeof PLANS
