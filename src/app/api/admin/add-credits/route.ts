import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail && user.email !== adminEmail) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminClient = createAdminClient()

  const { userId, amount } = await req.json()
  if (!userId || !amount || amount < 1) return NextResponse.json({ error: 'Params inválidos' }, { status: 400 })

  const { data: target, error: fetchErr } = await adminClient
    .from('users').select('credits').eq('id', userId).single()

  if (fetchErr || !target) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const { error: updateErr } = await adminClient
    .from('users').update({ credits: target.credits + amount }).eq('id', userId)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  console.log(`[admin] +${amount} credits → ${userId} (total: ${target.credits + amount})`)
  revalidatePath('/dashboard', 'layout')
  return NextResponse.json({ ok: true, newTotal: target.credits + amount })
}
