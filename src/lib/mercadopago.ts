import { MercadoPagoConfig } from 'mercadopago'
import { createAdminClient } from '@/lib/supabase/admin'

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

// Fallback hardcoded (used if DB is unavailable)
export const PLANS_DEFAULT = {
  perPhoto: {
    name: 'Restauração Avulsa',
    price: 19.00,
    credits: 1,
    description: '1 foto restaurada com IA em alta resolução',
  },
  subscription: {
    name: 'Assinatura Mensal',
    price: 59.00,
    credits: 10,
    description: '10 fotos por mês + histórico + download 4K',
  },
  package: {
    name: 'Pacote 10 Créditos',
    price: 129.00,
    credits: 10,
    description: '10 créditos sem expiração, use quando quiser',
  },
  starter: {
    name: 'Starter',
    price: 47.00,
    credits: 600,
    description: '500 créditos + 100 bônus — Gera imagens, vídeos e áudios.',
  },
  popular: {
    name: 'Popular',
    price: 79.00,
    credits: 1100,
    description: '1.000 créditos + 100 bônus — Equilíbrio entre imagens e vídeos.',
  },
  pro: {
    name: 'Pro',
    price: 149.00,
    credits: 2100,
    description: '2.000 créditos + 100 bônus — Produção intensa sem se preocupar.',
  },
  agency: {
    name: 'Agency',
    price: 397.00,
    credits: 5100,
    description: '5.000 créditos + 100 bônus — Volume máximo para produção profissional.',
  },
} as const

export type PlanType = 'perPhoto' | 'subscription' | 'package' | 'starter' | 'popular' | 'pro' | 'agency'

export type PlanData = {
  name: string
  price: number
  credits: number
  description: string
}

// Keep PLANS as alias for backwards compat (uses fallback)
export const PLANS: Record<PlanType, PlanData> = PLANS_DEFAULT

// Read plans from DB, fall back to hardcoded if unavailable
export async function getPlans(): Promise<Record<PlanType, PlanData>> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from('plans').select('*')
    if (!data || data.length === 0) return { ...PLANS_DEFAULT }
    const result = { ...PLANS_DEFAULT } as Record<PlanType, PlanData>
    for (const row of data) {
      if (row.id in result) {
        result[row.id as PlanType] = {
          name: row.name,
          price: parseFloat(row.price),
          credits: row.credits,
          description: row.description,
        }
      }
    }
    return result
  } catch {
    return { ...PLANS_DEFAULT }
  }
}
