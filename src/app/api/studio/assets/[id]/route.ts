export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/studio/assets/[id] — polling de status
───────────────────────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: asset, error } = await supabase
    .from('studio_assets')
    .select('id, status, result_url, error_msg, input_params')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !asset) return NextResponse.json({ error: 'Asset não encontrado' }, { status: 404 })
  return NextResponse.json({ asset })
}

/* ─────────────────────────────────────────────────────────────────────────────
   PATCH /api/studio/assets/[id] — atualiza board_order ou input_params
   Body: { board_order?: number, input_params?: object }
───────────────────────────────────────────────────────────────────────────── */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  if (body.board_order  !== undefined) updates.board_order  = body.board_order
  if (body.input_params !== undefined) updates.input_params = body.input_params
  if (body.status       !== undefined) updates.status       = body.status
  if (body.position_x   !== undefined) updates.position_x   = body.position_x
  if (body.position_y   !== undefined) updates.position_y   = body.position_y

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('studio_assets')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE /api/studio/assets/[id]
───────────────────────────────────────────────────────────────────────────── */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin
    .from('studio_assets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
