import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'

// Lazy initialization
let _client: MercadoPagoConfig | null = null

export function getMPClient(): MercadoPagoConfig {
  if (!_client) {
    if (!process.env.MP_ACCESS_TOKEN) {
      throw new Error('MP_ACCESS_TOKEN não configurada')
    }
    _client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN!,
      options: { timeout: 5000, idempotencyKey: undefined },
    })
  }
  return _client
}

export const PLANS = {
  perPhoto: {
    name: 'Pay-per-foto',
    price: 19.00,        // R$19
    credits: 1,
    description: '1 foto restaurada com IA em alta resolução',
  },
  subscription: {
    name: 'Assinatura Mensal',
    price: 59.00,        // R$59
    credits: 10,
    description: '10 fotos por mês + histórico + download 4K',
  },
  package: {
    name: 'Pacote 10 Créditos',
    price: 129.00,       // R$129
    credits: 10,
    description: '10 créditos sem expiração, use quando quiser',
  },
} as const

export type PlanType = keyof typeof PLANS
