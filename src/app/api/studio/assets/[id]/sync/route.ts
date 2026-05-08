export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GoogleAuth } from 'google-auth-library'
import Replicate from 'replicate'
import { classifyVeoGuidelineBlockMessage, extractVeoSupportCode, finalizeTalkingVideoBaseGeneration, isVeoGuidelineBlockMessage, startVeo3DirectGoogle } from '@/lib/studio'
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
  extraInputParams?: Record<string, unknown>
}) {
  await markStudioAssetFailed({
    admin: params.admin,
    assetId: params.assetId,
    errorMsg: params.errorMsg,
    refundReason: params.refundReason,
    extraInputParams: params.extraInputParams,
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
  errorCode?: string
  errorMessage?: string
  errorDetails?: unknown
  reason?: string
  topLevelKeys?: string[]
  responseKeys?: string[]
}) {
  console.log('[studio-sync:google]', JSON.stringify(params))
}

function normalizeVeoAttemptHistory(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .map((item) => ({ ...item }))
}

function markLatestVeoAttempt(
  history: Record<string, unknown>[],
  patch: Record<string, unknown>,
) {
  if (history.length === 0) return history
  const nextHistory = [...history]
  nextHistory[nextHistory.length - 1] = {
    ...nextHistory[nextHistory.length - 1],
    ...patch,
  }
  return nextHistory
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
        errorCode: typeof op?.error?.code === 'string' ? op.error.code : undefined,
        errorMessage: typeof op?.error?.message === 'string' ? op.error.message : undefined,
        errorDetails: op?.error?.details,
        topLevelKeys: Object.keys(op ?? {}),
        responseKeys: op?.response ? Object.keys(op.response) : [],
      })

      if (!op.done) {
        return syncResponse({ status: 'processing', message: 'Google Veo3 ainda processando...' })
      }

      if (op.error) {
        const providerErrorMessage = typeof op.error.message === 'string' ? op.error.message : 'Falha na geracao do Veo3'
        const providerErrorCode = typeof op.error.code === 'number' ? op.error.code : undefined
        const providerSupportCode = extractVeoSupportCode(providerErrorMessage)
        const videoGuidelineBlockKind = logicalType === 'video'
          ? classifyVeoGuidelineBlockMessage(providerErrorMessage)
          : 'none'
        const currentRetryCount = Math.max(0, Number(assetInputParams.veo_prompt_retry_count ?? 0))
        const currentAttemptHistory = normalizeVeoAttemptHistory(assetInputParams.veo_prompt_attempt_history)
        const nextAttemptHistory = markLatestVeoAttempt(currentAttemptHistory, {
          status: 'blocked_async',
          guideline_block_kind: videoGuidelineBlockKind !== 'none' ? videoGuidelineBlockKind : undefined,
          provider_error_message: providerErrorMessage,
          provider_error_code: providerErrorCode ?? null,
          provider_support_code: providerSupportCode || null,
          blocked_at: new Date().toISOString(),
        })

        console.error('[studio-sync:google:provider-error]', {
          assetId: id,
          logicalType,
          operationName: predictionId,
          providerError: op.error,
        })

        if (logicalType === 'video' && videoGuidelineBlockKind === 'prompt' && currentRetryCount < 2) {
          const nextRetryCount = currentRetryCount + 1
          const nextInputParams = {
            ...assetInputParams,
            veo_prompt_retry_count: nextRetryCount,
            veo_prompt_attempt_history: nextAttemptHistory,
            veo_guideline_block_kind: videoGuidelineBlockKind,
            veo_provider_error_code: providerErrorCode ?? null,
            veo_provider_error_message: providerErrorMessage,
            veo_provider_support_code: providerSupportCode || null,
            veo_blocked_source_image_url: String(assetInputParams.source_image_url ?? ''),
          }

          await admin.from('studio_assets').update({
            status: 'processing',
            error_msg: null,
            input_params: nextInputParams,
          }).eq('id', id)

          await startVeo3DirectGoogle({
            source_image_url: String(assetInputParams.source_image_url ?? ''),
            motion_prompt: String(assetInputParams.motion_prompt_normalized ?? assetInputParams.motion_prompt ?? ''),
            aspect_ratio: String(assetInputParams.aspect_ratio ?? '9:16'),
            model_prompt: typeof assetInputParams.model_prompt === 'string' ? assetInputParams.model_prompt : undefined,
            motion_prompt_raw: String(assetInputParams.motion_prompt_raw ?? assetInputParams.motion_prompt ?? ''),
            motion_prompt_normalized: String(assetInputParams.motion_prompt_normalized ?? assetInputParams.motion_prompt ?? ''),
            removed_directives: Array.isArray(assetInputParams.removed_directives)
              ? assetInputParams.removed_directives.filter((value): value is string => typeof value === 'string')
              : [],
            video_lock_policy: typeof assetInputParams.video_lock_policy === 'string' ? assetInputParams.video_lock_policy : '',
            scene_change_requested: Boolean(assetInputParams.scene_change_requested),
            scene_change_blocked: Boolean(assetInputParams.scene_change_blocked),
            duration: Number(assetInputParams.duration ?? 8),
            quality: String(assetInputParams.quality ?? assetInputParams.quality_requested ?? '720p'),
            assetId: id,
            userId: user.id,
            prompt_override: typeof assetInputParams.prompt_override === 'string' ? assetInputParams.prompt_override : undefined,
            generate_audio: Boolean(assetInputParams.generate_audio),
            strict_source_fidelity: String(assetInputParams.source_fidelity_mode ?? '') === 'strict',
            source_visible_item_manifest: Array.isArray(assetInputParams.source_visible_item_manifest)
              ? assetInputParams.source_visible_item_manifest.filter((value): value is string => typeof value === 'string')
              : [],
            source_text_logo_lock: Boolean(assetInputParams.source_text_logo_lock),
            source_color_lock: Boolean(assetInputParams.source_color_lock),
            guideline_block_handling: 'video',
            inputParamsPatch: {
              ...nextInputParams,
            },
          })

          return syncResponse({
            status: 'processing',
            message: 'Prompt ajustado para compatibilidade com Veo. Tentando novamente.',
          })
        }

        if (logicalType === 'talking_video' && isVeoGuidelineBlockMessage(providerErrorMessage) && currentRetryCount < 2) {
          const nextRetryCount = currentRetryCount + 1
          const nextInputParams = {
            ...assetInputParams,
            veo_prompt_retry_count: nextRetryCount,
            veo_prompt_attempt_history: nextAttemptHistory,
            veo_provider_error_code: providerErrorCode ?? null,
            veo_provider_error_message: providerErrorMessage,
            veo_provider_support_code: providerSupportCode || null,
          }

          await admin.from('studio_assets').update({
            status: 'processing',
            error_msg: null,
            input_params: nextInputParams,
          }).eq('id', id)

          await startVeo3DirectGoogle({
            source_image_url: String(assetInputParams.source_image_url ?? ''),
            motion_prompt: String(assetInputParams.motion_prompt_normalized ?? assetInputParams.motion_prompt ?? ''),
            aspect_ratio: String(assetInputParams.aspect_ratio ?? '9:16'),
            model_prompt: typeof assetInputParams.model_prompt === 'string' ? assetInputParams.model_prompt : undefined,
            motion_prompt_raw: String(assetInputParams.motion_prompt_raw ?? assetInputParams.motion_prompt ?? ''),
            motion_prompt_normalized: String(assetInputParams.motion_prompt_normalized ?? assetInputParams.motion_prompt ?? ''),
            removed_directives: Array.isArray(assetInputParams.removed_directives)
              ? assetInputParams.removed_directives.filter((value): value is string => typeof value === 'string')
              : [],
            video_lock_policy: typeof assetInputParams.video_lock_policy === 'string' ? assetInputParams.video_lock_policy : '',
            scene_change_requested: Boolean(assetInputParams.scene_change_requested),
            scene_change_blocked: Boolean(assetInputParams.scene_change_blocked),
            duration: Number(assetInputParams.duration ?? 8),
            quality: String(assetInputParams.quality ?? assetInputParams.quality_requested ?? '720p'),
            assetId: id,
            userId: user.id,
            prompt_override: typeof assetInputParams.prompt_override === 'string' ? assetInputParams.prompt_override : undefined,
            generate_audio: Boolean(assetInputParams.generate_audio),
            strict_source_fidelity: String(assetInputParams.source_fidelity_mode ?? '') === 'strict',
            source_visible_item_manifest: Array.isArray(assetInputParams.source_visible_item_manifest)
              ? assetInputParams.source_visible_item_manifest.filter((value): value is string => typeof value === 'string')
              : [],
            source_text_logo_lock: Boolean(assetInputParams.source_text_logo_lock),
            source_color_lock: Boolean(assetInputParams.source_color_lock),
            inputParamsPatch: {
              ...nextInputParams,
            },
          })

          return syncResponse({
            status: 'processing',
            message: 'Prompt ajustado para compatibilidade com Veo. Tentando novamente.',
          })
        }

        if (logicalType === 'video' && videoGuidelineBlockKind === 'input_image') {
          const friendlyMessage = 'O provedor de video bloqueou a imagem usada como base deste video. Tente outra imagem base ou gere uma nova cena antes de animar.'
          return failAssetAndRespond({
            admin,
            assetId: id,
            errorMsg: friendlyMessage,
            refundReason: 'sync:veo-input-image-blocked',
            extraInputParams: {
              veo_prompt_retry_count: currentRetryCount,
              veo_prompt_attempt_history: nextAttemptHistory,
              veo_guideline_block_kind: videoGuidelineBlockKind,
              veo_provider_error_code: providerErrorCode ?? null,
              veo_provider_error_message: providerErrorMessage,
              veo_provider_support_code: providerSupportCode || null,
              veo_blocked_source_image_url: String(assetInputParams.source_image_url ?? ''),
              public_error_code: 'imagem_base_bloqueada_pelo_provedor',
              public_error_title: 'A imagem base nao pode ser animada',
              public_error_message: friendlyMessage,
            },
          })
        }

        if (logicalType === 'video' && videoGuidelineBlockKind === 'unknown') {
          const friendlyMessage = 'O provedor de video bloqueou esta geracao. Tente ajustar o brief do video ou usar outra imagem base.'
          return failAssetAndRespond({
            admin,
            assetId: id,
            errorMsg: friendlyMessage,
            refundReason: 'sync:veo-guideline-unknown-blocked',
            extraInputParams: {
              veo_prompt_retry_count: currentRetryCount,
              veo_prompt_attempt_history: nextAttemptHistory,
              veo_guideline_block_kind: videoGuidelineBlockKind,
              veo_provider_error_code: providerErrorCode ?? null,
              veo_provider_error_message: providerErrorMessage,
              veo_provider_support_code: providerSupportCode || null,
              veo_blocked_source_image_url: String(assetInputParams.source_image_url ?? ''),
              public_error_code: 'falha_na_geracao',
              public_error_title: 'Bloqueio do provedor de video',
              public_error_message: friendlyMessage,
            },
          })
        }

        if ((logicalType === 'video' && videoGuidelineBlockKind === 'prompt') || (logicalType === 'talking_video' && isVeoGuidelineBlockMessage(providerErrorMessage))) {
          const friendlyMessage = 'Ajustamos seu prompt automaticamente para compatibilidade com o Veo, mas o provedor ainda bloqueou o conteudo. Tente remover promessas de resultado, temas sensiveis ou referencias a pessoas reais.'
          return failAssetAndRespond({
            admin,
            assetId: id,
            errorMsg: friendlyMessage,
            refundReason: 'sync:veo-guideline-terminal',
            code: 'prompt_safety_block',
            extraInputParams: {
              veo_prompt_retry_count: currentRetryCount,
              veo_prompt_attempt_history: nextAttemptHistory,
              veo_guideline_block_kind: logicalType === 'video' ? videoGuidelineBlockKind : 'prompt',
              veo_provider_error_code: providerErrorCode ?? null,
              veo_provider_error_message: providerErrorMessage,
              veo_provider_support_code: providerSupportCode || null,
              veo_blocked_source_image_url: logicalType === 'video' ? String(assetInputParams.source_image_url ?? '') : undefined,
              public_error_code: 'prompt_safety_block',
              public_error_title: 'Prompt bloqueado pelo provedor',
              public_error_message: friendlyMessage,
            },
          })
        }

        return failAssetAndRespond({
          admin,
          assetId: id,
          errorMsg: providerErrorMessage,
          refundReason: 'sync:veo-provider-error',
          extraInputParams: {
            veo_prompt_attempt_history: nextAttemptHistory,
            veo_guideline_block_kind: logicalType === 'video' ? videoGuidelineBlockKind : undefined,
            veo_provider_error_code: providerErrorCode ?? null,
            veo_provider_error_message: providerErrorMessage,
            veo_provider_support_code: providerSupportCode || null,
            veo_blocked_source_image_url: logicalType === 'video' && videoGuidelineBlockKind !== 'none'
              ? String(assetInputParams.source_image_url ?? '')
              : undefined,
          },
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
        const allReasons = [...directReasons, ...nestedReasons]
        console.log(`[studio-sync:rai-block] assetId=${id} count=${raiFilteredCount} reasons=${JSON.stringify(allReasons)}`)
        const reason = allReasons[0] || 'Bloqueado pelos filtros de seguranca do Google'
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
      const failureMetadata =
        error && typeof error === 'object'
          ? error as {
              studioFailureData?: Record<string, unknown>
              studioRefundReason?: string
            }
          : {}
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
        refundReason: failureMetadata.studioRefundReason ?? `sync:google-terminal:${errorCode ?? errorStatus}`,
        code: errorCode,
        extraInputParams: failureMetadata.studioFailureData,
      })
    }
  }

  if ((logicalType === 'video') && provider === 'grok') {
    const apiKey = process.env.XAI_API_KEY
    if (!apiKey) {
      return failAssetAndRespond({ admin, assetId: id, errorMsg: 'XAI_API_KEY nao configurada', refundReason: 'sync:grok-server-config' })
    }
    try {
      const statusRes = await fetch(`https://api.x.ai/v1/videos/${predictionId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      })
      if (!statusRes.ok) {
        const err = await statusRes.text()
        throw new Error(`Grok Video status ${statusRes.status}: ${err}`)
      }
      const statusData = await statusRes.json()
      if (statusData.status === 'pending') {
        return syncResponse({ status: 'processing', message: 'Grok Video gerando...' })
      }
      if (statusData.status === 'failed' || statusData.status === 'expired') {
        return failAssetAndRespond({ admin, assetId: id, errorMsg: `Grok Video falhou: ${statusData.status}`, refundReason: 'sync:grok-video-failed' })
      }
      if (statusData.status !== 'done') {
        return syncResponse({ status: 'processing', message: `Grok Video: ${statusData.status}` })
      }

      const videoUrl: string = statusData.video?.url ?? statusData.url ?? ''
      if (!videoUrl) {
        return failAssetAndRespond({ admin, assetId: id, errorMsg: 'Grok Video concluiu mas sem URL de vídeo.', refundReason: 'sync:grok-no-url' })
      }

      const videoRes = await fetch(videoUrl)
      if (!videoRes.ok) throw new Error(`Falha ao baixar vídeo Grok: ${videoRes.status}`)
      const buffer = Buffer.from(await videoRes.arrayBuffer())
      const { createAdminClient: makeAdmin } = await import('@/lib/supabase/admin')
      const adminLocal = makeAdmin()
      const storagePath = `${user.id}/${id}.mp4`
      const { error: uploadErr } = await adminLocal.storage.from('studio').upload(storagePath, buffer, { contentType: 'video/mp4', upsert: true })
      if (uploadErr) throw new Error(`Upload Grok vídeo falhou: ${uploadErr.message}`)
      const { data: { publicUrl: finalUrl } } = adminLocal.storage.from('studio').getPublicUrl(storagePath)

      const lastFrameUrl = await saveLastFrame(finalUrl, user.id, id).catch(() => null)
      await admin.from('studio_assets').update({
        status: 'done',
        result_url: finalUrl,
        last_frame_url: lastFrameUrl || finalUrl,
        error_msg: null,
      }).eq('id', id)

      return syncResponse({ status: 'done', result_url: finalUrl })
    } catch (error: unknown) {
      if (isRetryableSyncError(error)) {
        return syncResponse({ status: 'processing', message: 'Erro temporário ao consultar Grok. Tentando novamente.' })
      }
      return failAssetAndRespond({ admin, assetId: id, errorMsg: getErrorMessage(error), refundReason: 'sync:grok-video-error' })
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
