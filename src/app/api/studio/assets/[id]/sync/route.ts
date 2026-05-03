export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GoogleAuth } from 'google-auth-library'
import Replicate from 'replicate'
import { finalizeTalkingVideoBaseGeneration } from '@/lib/studio'
import { getLogicalStudioAssetType, mapStudioAssetType } from '@/lib/studioAssetType'
import { saveLastFrame } from '@/lib/videoUtils'
import { markStudioAssetFailed } from '@/lib/studioAssetFailure'
import { fetchGoogleOperation } from '@/lib/googleGenai'

type SyncBusinessStatus = 'processing' | 'done' | 'error'
type PersistableVeoResult = {
  externalUrl: string | null
  inlineBytesBase64: string | null
  mimeType: string
}

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

function isRetryableSyncError(error: unknown): boolean {
  const status = getErrorStatus(error, 0)
  const code = getErrorCode(error)?.toLowerCase() ?? ''
  const message = getErrorMessage(error).toLowerCase()

  if (status === 429 || status >= 500) return true
  if (['deadline_exceeded', 'resource_exhausted', 'unavailable'].includes(code)) return true
  return /timeout|timed out|network|fetch failed|econnreset|socket|temporary|temporar/i.test(message)
}

function syncResponse(body: {
  status: SyncBusinessStatus
  asset?: unknown
  result_url?: string | null
  error?: string
  message?: string
  code?: string
}) {
  return NextResponse.json(body)
}

function parseVertexCredentials(raw: string): Record<string, unknown> {
  const normalized = raw.startsWith('"') && raw.endsWith('"')
    ? JSON.parse(raw)
    : raw
  return typeof normalized === 'string' ? JSON.parse(normalized) : normalized
}

async function getVertexAccessToken(feature: string): Promise<string> {
  const rawKey = process.env.GOOGLE_VERTEX_KEY
  if (!rawKey) {
    throw new Error(`GOOGLE_VERTEX_KEY nao configurada para ${feature}.`)
  }

  const credentials = parseVertexCredentials(rawKey)
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  })
  const client = await auth.getClient()
  const token = await client.getAccessToken()
  if (!token.token) {
    throw new Error(`Token Google vazio para ${feature}.`)
  }
  return token.token
}

function parseGsUri(uri: string) {
  const match = uri.match(/^gs:\/\/([^/]+)\/(.+)$/i)
  if (!match) return null
  return {
    bucket: match[1],
    objectPath: match[2],
  }
}

async function downloadSourceVideoBuffer(url: string): Promise<Buffer> {
  if (url.startsWith('gs://')) {
    const parsed = parseGsUri(url)
    if (!parsed) throw new Error(`GCS URI invalida: ${url}`)

    const accessToken = await getVertexAccessToken('studio-sync:gcs-download')
    const storageUrl = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(parsed.bucket)}/o/${encodeURIComponent(parsed.objectPath)}?alt=media`
    const response = await fetch(storageUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Falha ao baixar objeto GCS (${response.status}) para ${url}`)
    }

    return Buffer.from(await response.arrayBuffer())
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Falha ao baixar video (${response.status}) para ${url}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

function extractPersistableVeoResult(candidate: unknown): PersistableVeoResult | null {
  if (typeof candidate === 'string' && candidate.trim()) {
    return {
      externalUrl: candidate,
      inlineBytesBase64: null,
      mimeType: 'video/mp4',
    }
  }

  if (!candidate || typeof candidate !== 'object') return null

  const record = candidate as {
    gcsUri?: unknown
    gcs_uri?: unknown
    uri?: unknown
    bytesBase64Encoded?: unknown
    bytes_base64_encoded?: unknown
    mimeType?: unknown
    mime_type?: unknown
  }
  const mimeTypeRaw = record.mimeType ?? record.mime_type
  const mimeType = typeof mimeTypeRaw === 'string' && mimeTypeRaw.trim()
    ? mimeTypeRaw
    : 'video/mp4'

  const gcsUriRaw = record.gcsUri ?? record.gcs_uri
  if (typeof gcsUriRaw === 'string' && gcsUriRaw.trim()) {
    return {
      externalUrl: gcsUriRaw,
      inlineBytesBase64: null,
      mimeType,
    }
  }

  if (typeof record.uri === 'string' && record.uri.trim()) {
    return {
      externalUrl: record.uri,
      inlineBytesBase64: null,
      mimeType,
    }
  }

  const bytesRaw = record.bytesBase64Encoded ?? record.bytes_base64_encoded
  if (typeof bytesRaw === 'string' && bytesRaw.trim()) {
    return {
      externalUrl: null,
      inlineBytesBase64: bytesRaw,
      mimeType,
    }
  }

  return null
}

function extractVeoResult(operationResponse: Record<string, unknown>): PersistableVeoResult | null {
  const response = operationResponse.response && typeof operationResponse.response === 'object'
    ? operationResponse.response as Record<string, unknown>
    : {}

  const directVideos = Array.isArray(response.videos) ? response.videos : []
  const generatedVideos = Array.isArray(response.generatedVideos) ? response.generatedVideos : (Array.isArray(response.generated_videos) ? response.generated_videos : [])
  const generateVideoResponse = response.generateVideoResponse ?? response.generate_video_response
  
  let generatedSamples: unknown[] = []
  if (generateVideoResponse && typeof generateVideoResponse === 'object') {
    const record = generateVideoResponse as Record<string, unknown>
    if (Array.isArray(record.generatedSamples)) generatedSamples = record.generatedSamples
    else if (Array.isArray(record.generated_samples)) generatedSamples = record.generated_samples
  }

  const directVideoResult = extractPersistableVeoResult(directVideos[0])
  if (directVideoResult) return directVideoResult

  const generatedVideo = generatedVideos[0]
  if (generatedVideo && typeof generatedVideo === 'object') {
    const videoResult = extractPersistableVeoResult((generatedVideo as { video?: unknown }).video)
    if (videoResult) return videoResult
  }

  const generatedSample = generatedSamples[0]
  if (generatedSample && typeof generatedSample === 'object') {
    const videoResult = extractPersistableVeoResult((generatedSample as { video?: unknown }).video)
    if (videoResult) return videoResult
  }

  return null
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
  source: PersistableVeoResult,
  userId: string,
  assetId: string,
): Promise<string> {
  const path = `${userId}/${assetId}-result.mp4`

  try {
    const buffer = source.inlineBytesBase64
      ? Buffer.from(source.inlineBytesBase64, 'base64')
      : await downloadSourceVideoBuffer(source.externalUrl ?? '')
    const { error } = await admin.storage.from('studio').upload(path, buffer, {
      contentType: source.mimeType || 'video/mp4',
      upsert: true,
    })
    if (error) {
      if (source.externalUrl) return source.externalUrl
      throw new Error(`Falha ao espelhar video inline no storage: ${error.message}`)
    }
    const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
    return publicUrl
  } catch (error) {
    if (source.externalUrl) return source.externalUrl
    throw error
  }
}

async function failAssetAndRespond(params: {
  admin: ReturnType<typeof createAdminClient>
  assetId: string
  errorMsg: string
  refundReason: string
  code?: string
}) {
  await markStudioAssetFailed({
    admin: params.admin,
    assetId: params.assetId,
    errorMsg: params.errorMsg,
    refundReason: params.refundReason,
  })

  return syncResponse({
    status: 'error',
    error: params.errorMsg,
    code: params.code,
  })
}

function logGoogleSync(params: {
  assetId: string
  logicalType: string
  operationName: string
  stage: string
  httpStatus?: number
  done?: boolean
  hasError?: boolean
  reason?: string
  topLevelKeys?: string[]
  responseKeys?: string[]
}) {
  console.log('[studio-sync:google]', JSON.stringify(params))
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
    .select('id, status, input_params, credits_cost, type, error_msg, result_url, last_frame_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!asset) return NextResponse.json({ error: 'Asset nao encontrado' }, { status: 404 })

  const assetInputParams = asRecord(asset.input_params)
  const logicalType = getLogicalStudioAssetType(asset.type, assetInputParams)

  if (asset.status === 'done') {
    return syncResponse({ status: 'done', asset: mapStudioAssetType(asset) })
  }

  if (asset.status === 'error') {
    return syncResponse({
      status: 'error',
      error: typeof asset.error_msg === 'string' && asset.error_msg.trim()
        ? asset.error_msg
        : 'Esse asset ja foi encerrado com falha.',
    })
  }

  const predictionId = typeof assetInputParams.prediction_id === 'string' ? assetInputParams.prediction_id : undefined
  if (!predictionId) {
    return asset.status === 'processing'
      ? syncResponse({ status: 'processing', message: 'Asset ainda aguardando prediction_id.' })
      : syncResponse({ status: 'error', error: 'prediction_id nao encontrado' })
  }

  const provider = typeof assetInputParams.provider === 'string' ? assetInputParams.provider : undefined
  const engine = typeof assetInputParams.engine === 'string' ? assetInputParams.engine : undefined
  const providerFamily = typeof assetInputParams.provider_family === 'string' ? assetInputParams.provider_family : undefined

  if ((logicalType === 'video' || logicalType === 'talking_video' || logicalType === 'animate') && (provider === 'google' || engine === 'veo' || providerFamily === 'google_cloud')) {
    const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY ?? 'vertex-managed'
    if (!apiKey) {
      return failAssetAndRespond({
        admin,
        assetId: id,
        errorMsg: 'GOOGLE_API_KEY / GEMINI_API_KEY nao configurada no servidor (Veo3)',
        refundReason: 'sync:veo-server-config',
      })
    }

    try {
      const opRes = await fetchGoogleOperation({
        operationName: predictionId,
        feature: `studio-sync:${logicalType}`,
      })

      logGoogleSync({
        assetId: id,
        logicalType,
        operationName: predictionId,
        stage: 'operation-response',
        httpStatus: opRes.status,
      })

      if (!opRes.ok) {
        return failAssetAndRespond({
          admin,
          assetId: id,
          errorMsg: 'Veo3: operacao nao encontrada no Google ou job bloqueado. Tente gerar novamente.',
          refundReason: 'sync:veo-operation-missing',
        })
      }

      const op = await opRes.json()
      logGoogleSync({
        assetId: id,
        logicalType,
        operationName: predictionId,
        stage: 'operation-payload',
        httpStatus: opRes.status,
        done: Boolean(op.done),
        hasError: Boolean(op.error),
        topLevelKeys: Object.keys(op ?? {}),
        responseKeys: op?.response ? Object.keys(op.response) : [],
      })

      if (!op.done) {
        return syncResponse({ status: 'processing', message: 'Google Veo3 ainda processando...' })
      }

      if (op.error) {
        return failAssetAndRespond({
          admin,
          assetId: id,
          errorMsg: op.error.message ?? 'Falha na geracao do Veo3',
          refundReason: 'sync:veo-provider-error',
        })
      }

      const finalResult = extractVeoResult(op as Record<string, unknown>)
      const responsePayload = asRecord(op.response)
      const generatedVideoResponse = asRecord(responsePayload.generateVideoResponse ?? responsePayload.generate_video_response)
      const raiFilteredCount = Number(
        responsePayload.raiMediaFilteredCount
        ?? responsePayload.rai_media_filtered_count
        ?? generatedVideoResponse.raiMediaFilteredCount
        ?? generatedVideoResponse.rai_media_filtered_count
        ?? 0,
      )
      const raiFiltered = Number.isFinite(raiFilteredCount) && raiFilteredCount > 0
      if (raiFiltered) {
        const directReasons = Array.isArray(responsePayload.raiMediaFilteredReasons ?? responsePayload.rai_media_filtered_reasons)
          ? (responsePayload.raiMediaFilteredReasons ?? responsePayload.rai_media_filtered_reasons) as unknown[]
          : []
        const nestedReasons = Array.isArray(generatedVideoResponse.raiMediaFilteredReasons ?? generatedVideoResponse.rai_media_filtered_reasons)
          ? (generatedVideoResponse.raiMediaFilteredReasons ?? generatedVideoResponse.rai_media_filtered_reasons) as unknown[]
          : []
        const reason = directReasons[0] || nestedReasons[0] || 'Bloqueado pelos filtros de seguranca do Google'
        return failAssetAndRespond({
          admin,
          assetId: id,
          errorMsg: `Seguranca Google: ${reason}`,
          refundReason: 'sync:veo-safety-filter',
        })
      }

      if (!finalResult) {
        return failAssetAndRespond({
          admin,
          assetId: id,
          errorMsg: 'Google Veo concluiu a operacao, mas nao retornou uma URL nem bytes finais do video. Gere novamente.',
          refundReason: 'sync:veo-missing-result-url',
        })
      }

      try {
        logGoogleSync({
          assetId: id,
          logicalType,
          operationName: predictionId,
          stage: 'result-detected',
          reason: finalResult.inlineBytesBase64 ? 'inline-bytes' : (finalResult.externalUrl?.startsWith('gs://') ? 'gcs-uri' : 'external-url'),
        })
      } catch {}

      let finalUrl: string | null
      try {
        finalUrl = await persistToStorage(admin, finalResult, user.id, id)
      } catch (error) {
        console.error('[studio-sync:google] failed to persist final video:', error)
        return failAssetAndRespond({
          admin,
          assetId: id,
          errorMsg: 'Google Veo concluiu a operacao, mas falhou ao persistir o video final.',
          refundReason: 'sync:veo-persist-result-failed',
        })
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
          return syncResponse({ status: 'processing', message: finalized.message, result_url: finalized.resultUrl })
        }

        if (finalized.status === 'error') {
          return failAssetAndRespond({
            admin,
            assetId: id,
            errorMsg: finalized.error ?? 'Falha ao finalizar o video falado.',
            refundReason: 'sync:talking-video-finalize',
          })
        }

        return syncResponse({ status: 'done', result_url: finalized.resultUrl ?? finalUrl })
      }

      const lastFrameUrl = await saveLastFrame(finalUrl, user.id, id).catch(() => null)
      await admin.from('studio_assets').update({
        status: 'done',
        result_url: finalUrl,
        last_frame_url: lastFrameUrl || finalUrl,
        error_msg: null,
        input_params: currentInputParams,
      }).eq('id', id)

      return syncResponse({ status: 'done', result_url: finalUrl })
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error)
      const errorStatus = getErrorStatus(error)
      const errorCode = getErrorCode(error)
      console.error('[studio-sync:google:error]', {
        assetId: id,
        logicalType,
        message: errorMessage,
        status: errorStatus,
        code: errorCode,
      })

      if (isRetryableSyncError(error)) {
        return syncResponse({
          status: 'processing',
          message: 'Nao foi possivel consultar o provedor agora. Tentaremos novamente.',
          code: errorCode,
        })
      }

      return failAssetAndRespond({
        admin,
        assetId: id,
        errorMsg: errorMessage,
        refundReason: `sync:google-terminal:${errorCode ?? errorStatus}`,
        code: errorCode,
      })
    }
  }

  if (logicalType === 'video' || logicalType === 'talking_video' || logicalType === 'lipsync') {
    const falKey = process.env.FAL_KEY
    if (!falKey) {
      return failAssetAndRespond({
        admin,
        assetId: id,
        errorMsg: 'FAL_KEY nao configurada',
        refundReason: 'sync:fal-server-config',
      })
    }

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
        return failAssetAndRespond({
          admin,
          assetId: id,
          errorMsg: 'Job expirado ou nao encontrado. Clique em "Tentar novamente" para gerar novamente.',
          refundReason: 'sync:fal-job-missing',
        })
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
          return failAssetAndRespond({
            admin,
            assetId: id,
            errorMsg: 'O job concluiu no provedor, mas o video final nao veio no payload.',
            refundReason: 'sync:fal-missing-result-url',
          })
        }

        const currentInputParams = asRecord(asset.input_params)
        const permanentUrl = await persistToStorage(admin, {
          externalUrl: videoUrl,
          inlineBytesBase64: null,
          mimeType: 'video/mp4',
        }, user.id, id)

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
            return syncResponse({ status: 'processing', message: finalized.message, result_url: finalized.resultUrl })
          }

          if (finalized.status === 'error') {
            return failAssetAndRespond({
              admin,
              assetId: id,
              errorMsg: finalized.error ?? 'Falha ao finalizar o video falado.',
              refundReason: 'sync:talking-video-finalize',
            })
          }

          return syncResponse({ status: 'done', result_url: finalized.resultUrl ?? permanentUrl })
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

        return syncResponse({ status: 'done', result_url: permanentUrl })
      }

      if (statusJson.status === 'ERROR' || statusJson.status === 'FAILED') {
        return failAssetAndRespond({
          admin,
          assetId: id,
          errorMsg: statusJson.error ? String(statusJson.error) : 'Geracao falhou no Fal AI',
          refundReason: `sync:fal-${String(statusJson.status).toLowerCase()}`,
        })
      }

      return syncResponse({
        status: 'processing',
        message: String(statusJson.status ?? 'processing'),
      })
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error)
      console.error(`[sync] Fal AI check failed for ${id}:`, errorMessage)

      if (isRetryableSyncError(error)) {
        return syncResponse({ status: 'processing', message: 'Nao foi possivel consultar o provedor agora. Tentaremos novamente.' })
      }

      return failAssetAndRespond({
        admin,
        assetId: id,
        errorMsg: errorMessage,
        refundReason: 'sync:fal-terminal-error',
      })
    }
  }

  try {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })
    const prediction = await replicate.predictions.get(predictionId)

    if (prediction.status === 'succeeded' && prediction.output) {
      const videoUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output as string
      await admin.from('studio_assets').update({ status: 'done', result_url: videoUrl, last_frame_url: videoUrl }).eq('id', id)
      return syncResponse({ status: 'done', result_url: videoUrl })
    }

    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      return failAssetAndRespond({
        admin,
        assetId: id,
        errorMsg: prediction.error ? String(prediction.error) : 'Geracao falhou no Replicate',
        refundReason: `sync:replicate-${prediction.status}`,
      })
    }

    return syncResponse({ status: 'processing', message: String(prediction.status ?? 'processing') })
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error)
    console.error(`[sync] Replicate check failed for ${id}:`, errorMessage)

    if (isRetryableSyncError(error)) {
      return syncResponse({ status: 'processing', message: 'Nao foi possivel consultar o provedor agora. Tentaremos novamente.' })
    }

    return failAssetAndRespond({
      admin,
      assetId: id,
      errorMsg: errorMessage,
      refundReason: 'sync:replicate-terminal-error',
    })
  }
}
