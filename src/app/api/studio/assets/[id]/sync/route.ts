export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Replicate from 'replicate'

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/studio/assets/[id]/sync
   Consulta o Replicate diretamente pelo prediction_id salvo no asset e
   sincroniza o status — alternativa ao webhook caso ele falhe (URL errada, etc)
───────────────────────────────────────────────────────────────────────────── */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  // Busca o asset com prediction_id
  const { data: asset } = await admin
    .from('studio_assets')
    .select('id, status, input_params, credits_cost, type')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!asset) return NextResponse.json({ error: 'Asset não encontrado' }, { status: 404 })
  if (asset.status === 'done') return NextResponse.json({ status: 'done', asset })

  // Busca o prediction_id (salvo em input_params quando a geração começa)
  const predictionId = (asset.input_params as Record<string, unknown>)?.prediction_id as string | undefined

  if (!predictionId) {
    // Sem prediction_id — tenta buscar pela lista de predictions do Replicate
    // como fallback simples: apenas retorna o status atual
    return NextResponse.json({ status: asset.status, message: 'prediction_id não encontrado — aguarde o webhook' })
  }

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })
  const prediction = await replicate.predictions.get(predictionId)

  if (prediction.status === 'succeeded' && prediction.output) {
    const videoUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output as string

    await admin.from('studio_assets').update({
      status: 'done',
      result_url: videoUrl,
      last_frame_url: videoUrl,
    }).eq('id', id)

    return NextResponse.json({ status: 'done', result_url: videoUrl })
  }

  if (prediction.status === 'failed' || prediction.status === 'canceled') {
    const errorMsg = prediction.error ? String(prediction.error) : 'Geração falhou no Replicate'
    await admin.from('studio_assets').update({
      status: 'error',
      error_msg: errorMsg,
    }).eq('id', id)

    return NextResponse.json({ status: 'error', error: errorMsg })
  }

  // Ainda processando
  return NextResponse.json({ status: prediction.status })
}
