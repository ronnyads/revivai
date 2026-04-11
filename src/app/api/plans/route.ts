export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getPlans } from '@/lib/mercadopago'

export async function GET() {
  const plans = await getPlans()
  return NextResponse.json(plans)
}
