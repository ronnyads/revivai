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

// Baixa url temporária e salva no Supabase Storage
async function persistToStorage(admin: ReturnType<typeof createAdminClient>, url: string, userId: string, assetId: string): Promise<string> {
  try {
    const res = await fetch(url)
    if (!res.ok) return url
    const buffer = Buffer.from(await res.arrayBuffer())
    const path = `${userId}/${assetId}-result.mp4`
    const { error } = await admin.storage.from('studio').upload(path, buffer, { contentType: 'video/mp4', upsert: true })
    if (error) return url
    const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
    return publicUrl
  } catch {
    return url
  }
}

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

  if (asset.type === 'lipsync' || asset.type === 'video' || asset.type === 'animate') {
    const falKey = process.env.FAL_KEY
    if (!falKey) return NextResponse.json({ status: 'error', error: 'FAL_KEY não configurada' })

    let modelPath = 'fal-ai/latentsync'
    if (asset.type === 'video') {
      const engine = (asset.input_params as any)?.engine
      if (engine === 'veo') modelPath = 'fal-ai/veo3.1/image-to-video'
      else modelPath = 'fal-ai/kling-video/o3/pro/image-to-video'
    } else if (asset.type === 'animate') {
      modelPath = 'fal-ai/live-portrait'
    }

    const res = await fetch(`https://queue.fal.run/${modelPath}/requests/${predictionId}/status`, {
      headers: { 'Authorization': `Key ${falKey}` }
    })
    const statusJson = await res.json()

    if (statusJson.status === 'COMPLETED' || statusJson.status === 'OK') {
      let videoUrl: string | null = null
      
      const outRes = await fetch(`https://queue.fal.run/${modelPath}/requests/${predictionId}`, {
        headers: { 'Authorization': `Key ${falKey}` }
      })
      if (outRes.ok) {
        const out = await outRes.json()
        const v = out.video
        const firstVidUrl = Array.isArray(v) ? v[0]?.url : v?.url
        videoUrl = firstVidUrl ?? out.video?.url ?? out.video_url ?? out.url ?? out.output?.[0] ?? out.payload?.video?.url ?? null
      }

      if (!videoUrl && statusJson.response_url) {
        const resultRes = await fetch(statusJson.response_url, { headers: { 'Authorization': `Key ${falKey}` } })
        if (resultRes.ok) {
          const resultPayload = await resultRes.json()
          const v = resultPayload.video
          const firstVidUrl = Array.isArray(v) ? v[0]?.url : v?.url
          videoUrl = firstVidUrl ?? resultPayload.video?.url ?? resultPayload.video_url ?? resultPayload.url ?? resultPayload.output?.[0] ?? resultPayload.payload?.video?.url ?? null
        }
      }
      
      if (!videoUrl) {
         return NextResponse.json({ status: 'processing', message: 'Video URL pending in payload' })
      }

      videoUrl = await persistToStorage(admin, videoUrl, user.id, id)

      await admin.from('studio_assets').update({
        status: 'done',
        result_url: videoUrl,
        last_frame_url: videoUrl,
        error_msg: null
      }).eq('id', id)
      return NextResponse.json({ status: 'done', result_url: videoUrl })
    }

    if (statusJson.status === 'ERROR' || statusJson.status === 'FAILED') {
      const errorMsg = statusJson.error ? String(statusJson.error) : 'Geração falhou no Fal AI'
      await admin.from('studio_assets').update({ status: 'error', error_msg: errorMsg }).eq('id', id)
      return NextResponse.json({ status: 'error', error: errorMsg })
    }

    return NextResponse.json({ status: statusJson.status || 'processing' })
  }

  // Fallback: Replicate logic for other assets
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

  return NextResponse.json({ status: prediction.status })
}
