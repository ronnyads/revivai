export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/* POST /api/studio/save-model — salva saved_model_prompt no perfil */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prompt } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'prompt obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('users')
    .update({ saved_model_prompt: prompt })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

/* GET /api/studio/save-model — retorna saved_model_prompt do perfil */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ prompt: null })

  const { data } = await supabase
    .from('users')
    .select('saved_model_prompt')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ prompt: data?.saved_model_prompt ?? null })
}
