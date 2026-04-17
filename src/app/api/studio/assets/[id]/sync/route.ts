export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Replicate from 'replicate'

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/studio/assets/[id]/sync
   Consulta o provedor (Fal AI ou Replicate) pelo prediction_id salvo no asset
   e sincroniza o status — fallback manual quando webhook falha ou polling expira
───────────────────────────────────────────────────────────────────────────── */

// Baixa URL temporária do provedor e re-sobe no Supabase Storage
async function persistToStorage(
  admin: ReturnType<typeof createAdminClient>,
  url: string,
  userId: string,
  assetId: string
): Promise<string> {
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  // Busca o asset
  const { data: asset } = await admin
    .from('studio_assets')
    .select('id, status, input_params, credits_cost, type')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!asset) return NextResponse.json({ error: 'Asset não encontrado' }, { status: 404 })
  if (asset.status === 'done') return NextResponse.json({ status: 'done', asset })

  const predictionId = (asset.input_params as Record<string, unknown>)?.prediction_id as string | undefined

  if (!predictionId) {
    return NextResponse.json({ status: asset.status, message: 'prediction_id não encontrado' })
  }

  // ── Fal AI: video (Kling/Veo3), animate (live-portrait), lipsync (latentsync)
  if (asset.type === 'video' || asset.type === 'animate' || asset.type === 'lipsync') {
    const falKey = process.env.FAL_KEY
    if (!falKey) return NextResponse.json({ status: 'error', error: 'FAL_KEY não configurada' }, { status: 500 })

    let modelPath: string
    if (asset.type === 'video') {
      const engine = (asset.input_params as any)?.engine
      modelPath = engine === 'veo'
        ? 'fal-ai/veo3.1/image-to-video'
        : 'fal-ai/kling-video/o3/pro/image-to-video'
    } else if (asset.type === 'animate') {
      modelPath = 'fal-ai/live-portrait'
    } else {
      modelPath = 'fal-ai/latentsync'
    }

    try {
      // 1. Checa status
      const statusRes = await fetch(
        `https://queue.fal.run/${modelPath}/requests/${predictionId}/status`,
        { headers: { 'Authorization': `Key ${falKey}` } }
      )
      if (!statusRes.ok) {
        const txt = await statusRes.text()
        return NextResponse.json({ status: 'error', error: `Fal AI status error: ${txt}` }, { status: 500 })
      }
      const statusJson = await statusRes.json()

      if (statusJson.status === 'COMPLETED' || statusJson.status === 'OK') {
        let videoUrl: string | null = null

        // 2. Busca resultado completo
        const outRes = await fetch(
          `https://queue.fal.run/${modelPath}/requests/${predictionId}`,
          { headers: { 'Authorization': `Key ${falKey}` } }
        )
        if (outRes.ok) {
          const out = await outRes.json()
          const v = out.video
          videoUrl = (Array.isArray(v) ? v[0]?.url : v?.url)
            ?? out.video_url ?? out.url ?? out.output?.[0] ?? null
        }

        // 3. Fallback via response_url
        if (!videoUrl && statusJson.response_url) {
          const rRes = await fetch(statusJson.response_url, { headers: { 'Authorization': `Key ${falKey}` } })
          if (rRes.ok) {
            const rPayload = await rRes.json()
            const v = rPayload.video
            videoUrl = (Array.isArray(v) ? v[0]?.url : v?.url)
              ?? rPayload.video_url ?? rPayload.url ?? rPayload.output?.[0] ?? null
          }
        }

        if (!videoUrl) {
          return NextResponse.json({ status: 'processing', message: 'Resultado ainda não disponível no payload' })
        }

        videoUrl = await persistToStorage(admin, videoUrl, user.id, id)

        await admin.from('studio_assets').update({
          status: 'done',
          result_url: videoUrl,
          last_frame_url: videoUrl,
          error_msg: null,
        }).eq('id', id)

        return NextResponse.json({ status: 'done', result_url: videoUrl })
      }

      if (statusJson.status === 'ERROR' || statusJson.status === 'FAILED') {
        const errorMsg = statusJson.error ? String(statusJson.error) : 'Geração falhou no Fal AI'
        await admin.from('studio_assets').update({ status: 'error', error_msg: errorMsg }).eq('id', id)
        return NextResponse.json({ status: 'error', error: errorMsg })
      }

      return NextResponse.json({ status: statusJson.status ?? 'processing' })

    } catch (err: any) {
      console.error(`[sync] Fal AI check failed for ${id}:`, err.message)
      return NextResponse.json({ status: 'error', error: err.message }, { status: 500 })
    }
  }

  // ── Replicate fallback (outros tipos futuros)
  try {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })
    const prediction = await replicate.predictions.get(predictionId)

    if (prediction.status === 'succeeded' && prediction.output) {
      const videoUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output as string
      await admin.from('studio_assets').update({ status: 'done', result_url: videoUrl, last_frame_url: videoUrl }).eq('id', id)
      return NextResponse.json({ status: 'done', result_url: videoUrl })
    }

    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      const errorMsg = prediction.error ? String(prediction.error) : 'Geração falhou no Replicate'
      await admin.from('studio_assets').update({ status: 'error', error_msg: errorMsg }).eq('id', id)
      return NextResponse.json({ status: 'error', error: errorMsg })
    }

    return NextResponse.json({ status: prediction.status })
  } catch (err: any) {
    console.error(`[sync] Replicate check failed for ${id}:`, err.message)
    return NextResponse.json({ status: 'error', error: err.message }, { status: 500 })
  }
}
