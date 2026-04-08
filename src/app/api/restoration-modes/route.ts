import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('restoration_modes')
    .select('id, name, description, icon, model')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ modes: data ?? [] })
}
