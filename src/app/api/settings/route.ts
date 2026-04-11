export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from('settings').select('key, value')
    const settings: Record<string, string> = {}
    data?.forEach((r: { key: string; value: string }) => { settings[r.key] = r.value })
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({})
  }
}
