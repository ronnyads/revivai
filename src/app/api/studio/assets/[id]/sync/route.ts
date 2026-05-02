export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Replicate from 'replicate'
import { finalizeTalkingVideoBaseGeneration } from '@/lib/studio'
import { getLogicalStudioAssetType, mapStudioAssetType } from '@/lib/studioAssetType'
import { saveLastFrame } from '@/lib/videoUtils'
import { markStudioAssetFailed } from '@/lib/studioAssetFailure'
import { fetchGoogleOperation } from '@/lib/googleGenai'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function getErrorStatus(error: unknown, fallback = 500): number {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number((error as { status?: unknown }).status)
    if (Number.isFinite(status) && status >= 400) return status
  }
  return fallback
}

function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code
    if (typeof code === 'string' && code.trim()) return code
  }
  return undefined
}

function resolveAppUrl(req: NextRequest) {
  const origin = req.headers.get('origin') ?? req.headers.get('x-forwarded-host')
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
  return origin
    ? (origin.startsWith('http') ? origin : `https://${origin}`)
    : (process.env.NEXT_PUBLIC_APP_URL ?? vercelUrl ?? 'http://localhost:3000')
}

async function persistToStorage(
  admin: ReturnType<typeof createAdminClient>,
  url: string,
  userId: string,
  assetId: string,
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
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: asset } = await admin
    .from('studio_assets')
    .select('id, status, input_params, credits_cost, type')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!asset) return NextResponse.json({ error: 'Asset nÃƒÂ£o encontrado' }, { status: 404 })
  const assetInputParams = asRecord(asset.input_params)
  const logicalType = getLogicalStudioAssetType(asset.type, assetInputParams)
  if (asset.status === 'done') return NextResponse.json({ status: 'done', asset: mapStudioAssetType(asset) })
  const predictionId = typeof assetInputParams.prediction_id === 'string' ? assetInputParams.prediction_id : undefined
  if (!predictionId) {
    return NextResponse.json({ status: asset.status, message: 'prediction_id nÃƒÂ£o encontrado' })
  }

  const provider = typeof assetInputParams.provider === 'string' ? assetInputParams.provider : undefined
  const engine = typeof assetInputParams.engine === 'string' ? assetInputParams.engine : undefined
  const providerFamily = typeof assetInputParams.provider_family === 'string' ? assetInputParams.provider_family : undefined

  if ((logicalType === 'video' || logicalType === 'talking_video' || logicalType === 'animate') && (provider === 'google' || engine === 'veo' || providerFamily === 'google_cloud')) {
    const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY ?? 'vertex-managed'
    if (!apiKey) {
      return NextResponse.json({ status: 'error', error: 'GOOGLE_API_KEY / GEMINI_API_KEY nÃƒÂ£o configurada no servidor (Veo3)' }, { status: 500 })
    }

    try {
      const opRes = await fetchGoogleOperation({
        operationName: predictionId,
        feature: `studio-sync:${logicalType}`,
      })
      if (!opRes.ok) {
        const errMsg = 'Veo3: operaÃƒÂ§ÃƒÂ£o nÃƒÂ£o encontrada no Google ou job bloqueado. Tente gerar novamente.'
        await markStudioAssetFailed({ admin, assetId: id, errorMsg: errMsg, refundReason: 'sync:veo-operation-missing' })
        return NextResponse.json({ status: 'error', error: errMsg })
      }

      const op = await opRes.json()
      console.log(`[sync] Google Operation Data for ${id}:`, JSON.stringify(op, null, 2))

      if (!op.done) return NextResponse.json({ status: 'processing', message: 'Google Veo3 ainda processando...' })

      if (op.error) {
        const errMsg = op.error.message ?? 'Falha na geraÃƒÂ§ÃƒÂ£o do Veo3'
        await markStudioAssetFailed({ admin, assetId: id, errorMsg: errMsg, refundReason: 'sync:veo-provider-error' })
        return NextResponse.json({ status: 'error', error: errMsg })
      }

      const sample = op.response?.generateVideoResponse?.generatedSamples?.[0]
      let finalUrl: string | null = sample?.video?.uri ?? null

      if (!finalUrl && op.response?.generatedVideos?.[0]?.video) {
        finalUrl = op.response.generatedVideos[0].video.uri || op.response.generatedVideos[0].video
      }

      const raiFiltered = op.response?.generateVideoResponse?.raiMediaFilteredCount > 0
      if (raiFiltered) {
        const reason = op.response?.generateVideoResponse?.raiMediaFilteredReasons?.[0] || 'Bloqueado pelos filtros de seguranÃƒÂ§a do Google'
        await markStudioAssetFailed({ admin, assetId: id, errorMsg: `SeguranÃƒÂ§a Google: ${reason}`, refundReason: 'sync:veo-safety-filter' })
        return NextResponse.json({ status: 'error', error: reason })
      }

      if (!finalUrl) {
        return NextResponse.json({ status: 'processing', message: 'Finalizando vÃƒÂ­deo Veo3 (URL em processamento)...' })
      }

      try {
        const vidReq = await fetch(finalUrl)
        if (vidReq.ok) {
          const buffer = Buffer.from(await vidReq.arrayBuffer())
          const path = `${user.id}/${id}-veo3.mp4`
          const { error: upErr } = await admin.storage.from('studio').upload(path, buffer, { contentType: 'video/mp4', upsert: true })
          if (!upErr) {
            const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
            finalUrl = publicUrl
          }
        }
      } catch (error) {
        console.error('[sync] Falha ao transpor vÃƒÂ­deo Veo3 p/ Storage:', error)
      }

      const currentInputParams = asRecord(asset.input_params)
      if (logicalType === 'talking_video') {
        const finalized = await finalizeTalkingVideoBaseGeneration({
          admin,
          assetId: id,
          userId: user.id,
          finalUrl,
          appUrl: resolveAppUrl(req),
          currentInputParams,
        })

        if (finalized.status === 'processing') {
          return NextResponse.json({ status: 'processing', message: finalized.message, result_url: finalized.resultUrl })
        }
        if (finalized.status === 'error') {
          return NextResponse.json({ status: 'error', error: finalized.error })
        }
        return NextResponse.json({ status: 'done', result_url: finalized.resultUrl ?? finalUrl })
      }

      const lastFrameUrl = await saveLastFrame(finalUrl, user.id, id).catch(() => null)
      await admin.from('studio_assets').update({
        status: 'done',
        result_url: finalUrl,
        last_frame_url: lastFrameUrl || finalUrl,
        error_msg: null,
        input_params: currentInputParams,
      }).eq('id', id)

      return NextResponse.json({ status: 'done', result_url: finalUrl })
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error)
      const errorStatus = getErrorStatus(error)
      const errorCode = getErrorCode(error)
      console.error(`[sync] Google Veo3 check failed for ${id}:`, {
        message: errorMessage,
        status: errorStatus,
        code: errorCode,
      })
      return NextResponse.json(
        { status: 'error', error: errorMessage, code: errorCode },
        { status: errorStatus },
      )
    }
  }

  if (logicalType === 'video' || logicalType === 'talking_video' || logicalType === 'lipsync') {
    const falKey = process.env.FAL_KEY
    if (!falKey) return NextResponse.json({ status: 'error', error: 'FAL_KEY nÃƒÂ£o configurada' }, { status: 500 })

    let modelPath: string
    if (logicalType === 'video') {
      const savedPath = typeof assetInputParams.fal_model_path === 'string' ? assetInputParams.fal_model_path : undefined
      modelPath = savedPath ?? (engine === 'veo' ? 'fal-ai/veo3.1/image-to-video' : 'fal-ai/kling-video/v1.5/pro/image-to-video')
    } else if (logicalType === 'talking_video') {
      const savedPath = typeof assetInputParams.fal_model_path === 'string' ? assetInputParams.fal_model_path : undefined
      modelPath = savedPath ?? 'fal-ai/sync-lipsync/v2/pro'
    } else {
      const savedPath = typeof assetInputParams.fal_model_path === 'string' ? assetInputParams.fal_model_path : undefined
      modelPath = savedPath ?? 'fal-ai/latentsync'
    }

    const altModelPath = logicalType === 'video'
      ? (modelPath.includes('veo') ? 'fal-ai/kling-video/v1.5/pro/image-to-video' : 'fal-ai/veo3.1/image-to-video')
      : null

    async function fetchFalStatus(path: string) {
      const response = await fetch(`https://queue.fal.run/${path}/requests/${predictionId}/status`, {
        headers: { Authorization: `Key ${falKey}` },
      })
      if (!response.ok) return null
      return response.json()
    }

    try {
      let statusJson = await fetchFalStatus(modelPath)
      if (!statusJson && altModelPath) {
        statusJson = await fetchFalStatus(altModelPath)
        if (statusJson) modelPath = altModelPath
      }
      if (!statusJson) {
        const errMsg = 'Job expirado ou nÃƒÂ£o encontrado. Clique em "Tentar novamente" para gerar novamente.'
        await markStudioAssetFailed({ admin, assetId: id, errorMsg: errMsg, refundReason: 'sync:fal-job-missing' })
        return NextResponse.json({ status: 'error', error: errMsg })
      }

      if (statusJson.status === 'COMPLETED' || statusJson.status === 'OK') {
        let videoUrl: string | null = null

        const outRes = await fetch(`https://queue.fal.run/${modelPath}/requests/${predictionId}`, {
          headers: { Authorization: `Key ${falKey}` },
        })
        if (outRes.ok) {
          const out = await outRes.json()
          const value = out.video
          videoUrl = (Array.isArray(value) ? value[0]?.url : value?.url)
            ?? out.video_url ?? out.url ?? out.output?.[0] ?? null
        }

        if (!videoUrl && statusJson.response_url) {
          const response = await fetch(statusJson.response_url, { headers: { Authorization: `Key ${falKey}` } })
          if (response.ok) {
            const payload = await response.json()
            const value = payload.video
            videoUrl = (Array.isArray(value) ? value[0]?.url : value?.url)
              ?? payload.video_url ?? payload.url ?? payload.output?.[0] ?? null
          }
        }

        if (!videoUrl) {
          return NextResponse.json({ status: 'processing', message: 'Resultado ainda nÃƒÂ£o disponÃƒÂ­vel no payload' })
        }

        const currentInputParams = asRecord(asset.input_params)
        const permanentUrl = await persistToStorage(admin, videoUrl, user.id, id)

        if (logicalType === 'talking_video' && String(currentInputParams.engine ?? '') !== 'sync-lipsync') {
          const finalized = await finalizeTalkingVideoBaseGeneration({
            admin,
            assetId: id,
            userId: user.id,
            finalUrl: permanentUrl,
            appUrl: resolveAppUrl(req),
            currentInputParams,
          })

          if (finalized.status === 'processing') {
            return NextResponse.json({ status: 'processing', message: finalized.message, result_url: finalized.resultUrl })
          }
          if (finalized.status === 'error') {
            return NextResponse.json({ status: 'error', error: finalized.error })
          }
          return NextResponse.json({ status: 'done', result_url: finalized.resultUrl ?? permanentUrl })
        }

        const lastFrameUrl = await saveLastFrame(permanentUrl, user.id, id).catch(() => null)
        await admin.from('studio_assets').update({
          status: 'done',
          result_url: permanentUrl,
          last_frame_url: lastFrameUrl || permanentUrl,
          error_msg: null,
          input_params: logicalType === 'talking_video'
            ? {
                ...currentInputParams,
                pipeline_stage: 'completed',
              }
            : currentInputParams,
        }).eq('id', id)

        return NextResponse.json({ status: 'done', result_url: permanentUrl })
      }

      if (statusJson.status === 'ERROR' || statusJson.status === 'FAILED') {
        const errorMsg = statusJson.error ? String(statusJson.error) : 'GeraÃƒÂ§ÃƒÂ£o falhou no Fal AI'
        await markStudioAssetFailed({ admin, assetId: id, errorMsg, refundReason: `sync:fal-${String(statusJson.status).toLowerCase()}` })
        return NextResponse.json({ status: 'error', error: errorMsg })
      }

      return NextResponse.json({ status: statusJson.status ?? 'processing' })
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error)
      console.error(`[sync] Fal AI check failed for ${id}:`, errorMessage)
      return NextResponse.json({ status: 'error', error: errorMessage }, { status: 500 })
    }
  }

  try {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })
    const prediction = await replicate.predictions.get(predictionId)

    if (prediction.status === 'succeeded' && prediction.output) {
      const videoUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output as string
      await admin.from('studio_assets').update({ status: 'done', result_url: videoUrl, last_frame_url: videoUrl }).eq('id', id)
      return NextResponse.json({ status: 'done', result_url: videoUrl })
    }

    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      const errorMsg = prediction.error ? String(prediction.error) : 'GeraÃƒÂ§ÃƒÂ£o falhou no Replicate'
      await markStudioAssetFailed({ admin, assetId: id, errorMsg, refundReason: `sync:replicate-${prediction.status}` })
      return NextResponse.json({ status: 'error', error: errorMsg })
    }

    return NextResponse.json({ status: prediction.status })
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error)
    console.error(`[sync] Replicate check failed for ${id}:`, errorMessage)
    return NextResponse.json({ status: 'error', error: errorMessage }, { status: 500 })
  }
}

