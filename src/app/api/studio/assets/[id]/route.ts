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
    .select('id, status, result_url, last_frame_url, error_msg, input_params, type, credits_cost')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !asset) return NextResponse.json({ error: 'Asset não encontrado' }, { status: 404 })
  // Se estiver processing e tiver prediction_id, tenta fazer um sync automático p/ front-end não ficar cego
  if (asset.status === 'processing' && typeof asset.input_params === 'object' && asset.input_params !== null) {
    const params = asset.input_params as Record<string, unknown>
    if (params.prediction_id) {
      try {
        // Usa a própria NextRequest URL host para dar um POST /sync interno
        const syncUrl = new URL(`/api/studio/assets/${asset.id}/sync`, req.url)
        const syncReq = await fetch(syncUrl.toString(), {
          method: 'POST',
          headers: { 'cookie': req.headers.get('cookie') || '' } // repassa cookie se precisar
        })
        if (syncReq.ok) {
          const syncData = await syncReq.json()
          if (syncData.status === 'done' || syncData.status === 'error') {
            // Se completou, busca o asset atualizado do banco
            const { data: updatedAsset } = await supabase.from('studio_assets').select('id, status, result_url, last_frame_url, error_msg, input_params, type, credits_cost').eq('id', id).single()
            if (updatedAsset) {
              return NextResponse.json({ asset: updatedAsset })
            }
          }
        }
      } catch (e) {
        console.error('[GET asset] falha no auto-sync background:', e)
      }
    }
  }

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
  if (id.startsWith('temp-')) {
    return NextResponse.json({ error: 'ID temporário não deve ser persistido via API' }, { status: 400 })
  }
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  if (body.board_order  !== undefined) updates.board_order  = body.board_order
  if (body.input_params !== undefined) updates.input_params = body.input_params
  if (body.status       !== undefined) updates.status       = body.status
  if (body.position_x   !== undefined) updates.position_x   = body.position_x
  if (body.position_y   !== undefined) updates.position_y   = body.position_y

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })

  const { data: existingAsset } = await supabase
    .from('studio_assets')
    .select('project_id, input_params')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (body.input_params !== undefined) {
    const currentInputParams =
      existingAsset?.input_params && typeof existingAsset.input_params === 'object'
        ? (existingAsset.input_params as Record<string, unknown>)
        : {}

    const nextInputParams =
      body.input_params && typeof body.input_params === 'object'
        ? (body.input_params as Record<string, unknown>)
        : {}

    updates.input_params = { ...currentInputParams, ...nextInputParams }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('studio_assets')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (existingAsset?.project_id) {
    await admin
      .from('studio_projects')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', existingAsset.project_id)
      .eq('user_id', user.id)
  }

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
  const { data: existingAsset } = await supabase
    .from('studio_assets')
    .select('project_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  const admin = createAdminClient()
  const { error } = await admin
    .from('studio_assets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (existingAsset?.project_id) {
    await admin
      .from('studio_projects')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', existingAsset.project_id)
      .eq('user_id', user.id)
  }

  return NextResponse.json({ ok: true })
}
