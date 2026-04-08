import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('restoration_modes')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[restoration-modes] DB error:', error.message, error.details)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ modes: data ?? [] })
}
