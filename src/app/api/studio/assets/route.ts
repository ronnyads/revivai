export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CREDIT_COST, generateImage, generateScript, generateVoice, generateCaption, generateUpscale, startVideoGeneration, startVeo3DirectGoogle, generateModel, mergeVideoAudio, startAnimateGeneration, composeProductScene, preflightProvadorPricing, startLipsyncGeneration, joinVideos, generateAngles, generateMusic, generateUGCPositions, generateScene, splitLookReferences, prepareLockedVideoMotionPrompt, prepareTalkingVideoPrompt, estimateTalkingSpeechDurationSeconds, measureAudioDurationSeconds, incrementTalkingPipelineAttempts } from '@/lib/studio'
import { markStudioAssetFailed } from '@/lib/studioAssetFailure'
import { resolveStudioPublicError, type StudioPublicErrorEnvelope } from '@/lib/studioPublicErrors'
import { getLogicalStudioAssetType, getPersistedStudioAssetType, mapStudioAssetType } from '@/lib/studioAssetType'
import { AssetType } from '@/types'
import { checkRateLimit } from '@/lib/rateLimit'
import {
  buildTalkingVideoIdeaFromParts,
  normalizeTalkingWhitespace,
  planTalkingVideoSpeechChunk,
} from '@/lib/talkingVideoIdea'

type StudioAssetRecord = {
  id: string
  [key: string]: unknown
}

type ExistingAssetOwnership = {
  id: string
  project_id: string
  user_id: string
  type: AssetType
  input_params?: Record<string, unknown>
}

type ConnectionRecoveryRow = {
  source_id: string
  created_at: string
}

type RecoverySourceAssetRow = {
  id: string
  result_url: string | null
  project_id: string
  user_id: string
}

function normalizeOptionalUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function mergeTalkingSpeechText(...parts: Array<unknown>) {
  return normalizeTalkingWhitespace(
    parts
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(' '),
  )
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function createComposeInputError(code: string, message: string) {
  return NextResponse.json({
    error: 'invalid_compose_input',
    code,
    message,
  }, { status: 400 })
}

function createAssetInputError(code: string, message: string) {
  return NextResponse.json({
    error: 'invalid_asset_input',
    code,
    message,
  }, { status: 400 })
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function buildStudioPublicErrorEnvelope(params: {
  type?: AssetType
  inputParams?: Record<string, unknown>
  errorMsg: string
  supportDebugId: string
}): StudioPublicErrorEnvelope {
  const inputParams = params.inputParams ?? {}
  const composeVariant = typeof inputParams.compose_variant === 'string' ? inputParams.compose_variant : ''
  const failureState = typeof inputParams.failure_state === 'string' ? inputParams.failure_state : ''
  const technicalMessage = params.errorMsg.toLowerCase()

  if (params.type === 'compose' && composeVariant === 'fitting') {
    if (failureState === 'split_required_after_outerwear_failure' || failureState === 'split_required_after_garment_priority') {
      return resolveStudioPublicError({
        code: 'resultado_pronto_para_revisao',
        message: 'Separamos as pecas principais e deixamos um caminho mais estavel pronto para voce seguir.',
        supportDebugId: params.supportDebugId,
      })
    }

    if (failureState === 'manual_split_required') {
      return resolveStudioPublicError({
        code: 'precisamos_de_uma_foto_mais_limpa',
        supportDebugId: params.supportDebugId,
      })
    }

    if (/timeout|timed out|503|502|500|429|network|fetch failed|econnreset|not found|provider|vertex|google/i.test(technicalMessage)) {
      return resolveStudioPublicError({
        code: 'nao_conseguimos_vestir_esse_look',
        message: 'Tivemos uma falha temporaria ao montar esse look. Tente de novo e seguiremos da forma mais estavel.',
        supportDebugId: params.supportDebugId,
      })
    }

    return resolveStudioPublicError({
      code: 'nao_conseguimos_vestir_esse_look',
      supportDebugId: params.supportDebugId,
    })
  }

  return resolveStudioPublicError({
    code: 'falha_na_geracao',
    supportDebugId: params.supportDebugId,
  })
}

function resolveAppUrl(req: NextRequest) {
  const origin = req.headers.get('origin') ?? req.headers.get('x-forwarded-host')
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
  return origin
    ? (origin.startsWith('http') ? origin : `https://${origin}`)
    : (process.env.NEXT_PUBLIC_APP_URL ?? vercelUrl ?? 'http://localhost:3000')
}

async function withStageRetry<T>(
  task: () => Promise<T>,
  options: {
    attempts: number
    isRetryable?: (error: unknown) => boolean
  },
) {
  let lastError: unknown
  for (let attempt = 0; attempt < options.attempts; attempt += 1) {
    try {
      return await task()
    } catch (error) {
      lastError = error
      const retryable = options.isRetryable
        ? options.isRetryable(error)
        : (error instanceof Error
          ? /timeout|timed out|429|rate limit|ECONNRESET|fetch failed|network/i.test(error.message)
          : false)
      if (!retryable || attempt === options.attempts - 1) break
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

const COMPOSE_RUNTIME_INPUT_KEYS = new Set([
  'engine_trace',
  'retry_reason',
  'fitting_route',
  'stage1_engine',
  'stage2_engine',
  'final_qc_status',
  'qc_failure_kind',
  'vertex_call_count',
  'candidate_attempts',
  'ignored_prop_types',
  'omitted_item_count',
  'accessory_set_count',
  'detected_categories',
  'editorial_qc_status',
  'gemini_models_tried',
  'selected_item_zones',
  'accessory_qc_results',
  'fallback_branch_used',
  'accessory_total_count',
  'fitting_primary_route',
  'fitting_rescue_engine',
  'fitting_rescue_policy',
  'segmented_items_count',
  'vertex_execution_path',
  'reference_padding_mode',
  'editorial_finisher_used',
  'editorial_props_applied',
  'vertex_prediction_count',
  'accessory_detected_count',
  'accessory_detected_types',
  'accessory_detected_zones',
  'accessory_reference_kind',
  'accessory_reference_mode',
  'editorial_finisher_model',
  'estimated_cost_breakdown',
  'selected_item_categories',
  'vertex_validation_target',
  'editorial_prop_candidates',
  'primary_wearable_category',
  'vertex_product_count_sent',
  'gemini_image_attempt_count',
  'editorial_finisher_eligible',
  'estimated_provider_cost_usd',
  'fitting_generation_strategy',
  'vertex_candidate_categories',
  'editorial_finisher_attempted',
  'preflight_ignored_prop_types',
  'vertex_multi_product_candidate',
  'vertex_product_count_requested',
  'vertex_requested_product_count',
  'accessory_overlay_skipped_reason',
  'editorial_finisher_attempt_count',
  'single_photo_segmented_item_count',
  'vertex_single_photo_fallback_used',
  'preflight_accessory_detected_types',
  'single_photo_group_decision_source',
  'preflight_primary_wearable_category',
  'vertex_single_photo_fallback_trigger',
  'single_photo_primary_wearable_category',
  'vertex_single_photo_fallback_attempted',
  'fitting_reference_mode_internal',
  'auto_split_attempted',
  'auto_split_selected_categories',
  'auto_split_reference_count',
  'qc_failure_category',
  'auto_split_failed_stage',
  'vertex_batch_sent_all_items',
  'vertex_batch_qc_weakest',
  'vertex_batch_qc_issues',
  'vertex_batch_error',
  'vertex_sequence_categories',
  'vertex_sequence_steps',
  'accessory_reference_count',
  'failure_state',
  'next_action',
  'guided_split_generated',
  'guided_split_reference_count',
  'guided_split_categories',
  'guided_split_status',
  'guided_split_references',
  'outerwear_failure_policy',
  'accessory_core_policy',
  'outerwear_policy',
  'accessories_overlay_only',
  'structural_categories_detected',
  'accessory_categories_detected',
  'escalation_reason',
  'credit_protected',
  'duplicate_charge_blocked',
  'billing_reason',
  'single_photo_primary_product_type',
  'single_photo_garment_priority_applied',
  'single_photo_overlay_only_categories',
  'single_photo_ignored_props',
])

function sanitizeComposeInputParams(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([key]) => {
      if (COMPOSE_RUNTIME_INPUT_KEYS.has(key)) return false
      if (
        key.startsWith('credit_refund')
        || key.startsWith('credit_refunded')
      ) return false
      return true
    }),
  )
}

async function recoverPortraitUrlFromConnections(params: {
  admin: ReturnType<typeof createAdminClient>
  projectId: string
  userId: string
  targetAssetId?: string
}): Promise<{ portraitUrl?: string; sourceAssetId?: string }> {
  if (!params.targetAssetId) return {}

  const { data: connectionRows, error: connectionError } = await params.admin
    .from('studio_connections')
    .select('source_id, created_at')
    .eq('project_id', params.projectId)
    .eq('target_id', params.targetAssetId)
    .eq('target_handle', 'portrait_url')
    .order('created_at', { ascending: false })
    .limit(8)

  if (connectionError) {
    console.warn('[studio] compose-input-recovery skipped | reason=connection-query-failed', connectionError.message)
    return {}
  }

  const connections = (connectionRows ?? []) as ConnectionRecoveryRow[]
  if (connections.length === 0) return {}

  const sourceIds = Array.from(new Set(connections.map((connection) => connection.source_id).filter(Boolean)))
  if (sourceIds.length === 0) return {}

  const { data: sourceRows, error: sourceError } = await params.admin
    .from('studio_assets')
    .select('id, result_url, project_id, user_id')
    .in('id', sourceIds)

  if (sourceError) {
    console.warn('[studio] compose-input-recovery skipped | reason=source-query-failed', sourceError.message)
    return {}
  }

  const sourceById = new Map(
    ((sourceRows ?? []) as RecoverySourceAssetRow[]).map((row) => [row.id, row]),
  )

  for (const connection of connections) {
    const sourceAsset = sourceById.get(connection.source_id)
    const candidateUrl = normalizeOptionalUrl(sourceAsset?.result_url)
    if (!sourceAsset || !candidateUrl) continue
    if (sourceAsset.project_id !== params.projectId || sourceAsset.user_id !== params.userId) continue
    if (!isValidHttpUrl(candidateUrl)) continue
    return { portraitUrl: candidateUrl, sourceAssetId: sourceAsset.id }
  }

  return {}
}

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/studio/assets — cria asset e dispara geração
   Body: { project_id, type, input_params }
───────────────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── Rate limit ──
  if (!checkRateLimit(user.id, 'studio-asset', { max: 60, windowMs: 60_000 })) {
    return NextResponse.json({ error: 'Muitos assets gerados.' }, { status: 429 })
  }

  const body = await req.json()
  const { project_id, type, input_params, existing_id, frontend_id } = body as {
    project_id: string
    type: AssetType
    input_params: Record<string, unknown>
    existing_id?: string
    frontend_id?: string
  }
  const isDraft = body.status === 'idle'
  const persistedType = getPersistedStudioAssetType(type)

  if (!project_id || !type) return NextResponse.json({ error: 'project_id e type obrigatÃ³rios' }, { status: 400 })

  if (existing_id && frontend_id && existing_id !== frontend_id) {
    return NextResponse.json({ error: 'existing_id e frontend_id conflitam' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Confirma posse do projeto antes de qualquer write com service-role.
  const { data: project, error: projectErr } = await admin
    .from('studio_projects')
    .select('id, user_id')
    .eq('id', project_id)
    .maybeSingle()

  if (projectErr) {
    return NextResponse.json({ error: 'Falha ao validar projeto' }, { status: 500 })
  }
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: 'Projeto nÃ£o encontrado' }, { status: 403 })
  }

  const requestedAssetId = frontend_id || existing_id
  if (requestedAssetId) {
    const { data: existingAsset, error: existingAssetErr } = await admin
      .from('studio_assets')
      .select('id, project_id, user_id, type, input_params')
      .eq('id', requestedAssetId)
      .maybeSingle()

    if (existingAssetErr) {
      return NextResponse.json({ error: 'Falha ao validar asset' }, { status: 500 })
    }

    if (existingAsset) {
      const ownedAsset = existingAsset as ExistingAssetOwnership
      if (ownedAsset.user_id !== user.id || ownedAsset.project_id !== project_id) {
        return NextResponse.json({ error: 'Asset nÃ£o pertence a este projeto' }, { status: 403 })
      }
      if (getLogicalStudioAssetType(ownedAsset.type, ownedAsset.input_params) !== type) {
        return NextResponse.json({ error: 'Tipo do asset nÃ£o pode ser alterado' }, { status: 409 })
      }
    } else if (existing_id) {
      return NextResponse.json({ error: 'Asset para regenerar nÃ£o encontrado' }, { status: 404 })
    }
  }

  if (!project_id || !type) return NextResponse.json({ error: 'project_id e type obrigatórios' }, { status: 400 })

  let normalizedInputParams: Record<string, unknown> = { ...(input_params ?? {}) }
  if (type === 'compose') {
    normalizedInputParams = sanitizeComposeInputParams(normalizedInputParams)
    const composeRestInputParams = { ...normalizedInputParams }
    delete composeRestInputParams.fitting_group
    const composeVariant = String(normalizedInputParams.compose_variant ?? 'fitting')
    const composeMode = String(normalizedInputParams.compose_mode ?? 'try-on')
    const fittingGroup =
      normalizedInputParams.fitting_group === 'fashion_accessories'
        ? 'fashion_accessories'
        : normalizedInputParams.fitting_group === 'wearables'
          ? 'wearables'
          : undefined
    const rawProductUrl = normalizeOptionalUrl(normalizedInputParams.product_url)
    const normalizedProductUrls = Array.isArray(normalizedInputParams.product_urls)
      ? normalizedInputParams.product_urls
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && isValidHttpUrl(value))
      : []
    const resolvedProductUrl = rawProductUrl && isValidHttpUrl(rawProductUrl)
      ? rawProductUrl
      : normalizedProductUrls[0]

    normalizedInputParams = {
      ...composeRestInputParams,
      compose_variant: composeVariant,
      compose_mode: composeMode,
      ...(fittingGroup ? { fitting_group: fittingGroup } : {}),
      product_url: resolvedProductUrl ?? '',
      product_urls: normalizedProductUrls,
      portrait_url: normalizeOptionalUrl(normalizedInputParams.portrait_url) ?? '',
    }

    if (!isDraft) {
      if (!resolvedProductUrl) {
        console.warn('[studio] compose-input-invalid | field=product_url reason=missing')
        return createComposeInputError(
          'product_url_required',
          'Envie pelo menos uma referencia valida da peca antes de gerar a composicao.',
        )
      }

      if (composeVariant === 'fitting') {
        let portraitUrl = normalizeOptionalUrl(normalizedInputParams.portrait_url)
        if (!portraitUrl) {
          const recovered = await recoverPortraitUrlFromConnections({
            admin,
            projectId: project_id,
            userId: user.id,
            targetAssetId: requestedAssetId,
          })

          if (recovered.portraitUrl) {
            const inputRecovery = asRecord(normalizedInputParams.input_recovery)
            portraitUrl = recovered.portraitUrl
            normalizedInputParams = {
              ...normalizedInputParams,
              portrait_url: portraitUrl,
              input_recovery: {
                ...inputRecovery,
                portrait_url: 'connection:auto',
              },
            }
            console.log(`[studio] compose-input-recovered | field=portrait_url source_asset=${recovered.sourceAssetId}`)
          }
        }

        if (!portraitUrl) {
          console.warn('[studio] compose-input-invalid | field=portrait_url reason=missing')
          return createComposeInputError(
            'portrait_url_required',
            'Conecte uma imagem/modelo ao campo Modelo antes de gerar o Provador.',
          )
        }

        if (!isValidHttpUrl(portraitUrl)) {
          console.warn('[studio] compose-input-invalid | field=portrait_url reason=invalid')
          return createComposeInputError(
            'portrait_url_invalid',
            'A imagem da modelo esta invalida. Atualize o card e tente novamente.',
          )
        }
      }
    }
  }

  // 1. Cálculo de Custo e Verificação de Saldo
  if (type === 'look_split') {
    const sourceUrl = normalizeOptionalUrl(normalizedInputParams.source_url)
    const smartPrompt = typeof normalizedInputParams.smart_prompt === 'string'
      ? normalizedInputParams.smart_prompt.trim()
      : ''

    normalizedInputParams = {
      ...normalizedInputParams,
      source_url: sourceUrl ?? '',
      smart_prompt: smartPrompt,
    }

    if (!isDraft) {
      if (!sourceUrl) {
        console.warn('[studio] look-split invalid | field=source_url reason=missing')
        return createAssetInputError(
          'source_url_required',
          'Envie uma foto de look/catalogo antes de separar as referencias.',
        )
      }

      if (!isValidHttpUrl(sourceUrl)) {
        console.warn('[studio] look-split invalid | field=source_url reason=invalid')
        return createAssetInputError(
          'source_url_invalid',
          'A imagem de origem esta invalida. Atualize o card e tente novamente.',
        )
      }
    }
  }

  if (type === 'video') {
    const sourceImageUrl = normalizeOptionalUrl(normalizedInputParams.source_image_url)
    const continuationFrame = normalizeOptionalUrl(normalizedInputParams.continuation_frame)
    const motionPromptRaw = typeof normalizedInputParams.motion_prompt === 'string'
      ? normalizedInputParams.motion_prompt.trim()
      : ''
    const modelPrompt = typeof normalizedInputParams.model_prompt === 'string'
      ? normalizedInputParams.model_prompt.trim()
      : ''
    const videoPromptPolicy = prepareLockedVideoMotionPrompt({
      motionPrompt: motionPromptRaw,
      modelPrompt: modelPrompt || undefined,
    })

    normalizedInputParams = {
      ...normalizedInputParams,
      source_image_url: sourceImageUrl ?? '',
      continuation_frame: continuationFrame ?? '',
      motion_prompt: motionPromptRaw,
      motion_prompt_raw: videoPromptPolicy.rawPrompt,
      motion_prompt_normalized: videoPromptPolicy.normalizedPrompt,
      video_lock_policy: videoPromptPolicy.videoLockPolicy,
      scene_change_requested: videoPromptPolicy.sceneChangeRequested,
      scene_change_blocked: false,
      removed_directives: videoPromptPolicy.removedDirectives,
    }

    if (!isDraft) {
      if (!sourceImageUrl && !continuationFrame) {
        return createAssetInputError(
          'source_image_url_required',
          'Conecte uma imagem base ou uma continuacao antes de gerar o video.',
        )
      }

      if (videoPromptPolicy.sceneChangeRequested) {
        console.warn('[studio] video-input-invalid | field=motion_prompt reason=scene-change-requested')
        return createAssetInputError(
          'video_scene_change_requires_scene_card',
          'Esse card de video so anima o frame atual. Para trocar cenario ou ambiente, gere a cena correta em Cena Livre e depois volte para Video.',
        )
      }
    }
  }

  if (type === 'talking_video') {
    const sourceImageUrl = normalizeOptionalUrl(normalizedInputParams.source_image_url)
    const talkingVideoMode = String(normalizedInputParams.talking_video_mode ?? 'exact_speech') === 'veo_natural'
      ? 'veo_natural'
      : 'exact_speech'
    const ideaPromptInputRaw = typeof normalizedInputParams.idea_prompt === 'string'
      ? normalizedInputParams.idea_prompt.trim()
      : ''
    const speechTextInputRaw = typeof normalizedInputParams.speech_text === 'string'
      ? normalizedInputParams.speech_text.trim()
      : ''
    const expressionDirectionInputRaw = typeof normalizedInputParams.expression_direction === 'string'
      ? normalizedInputParams.expression_direction.trim()
      : ''
    const visualPromptInputRaw = typeof normalizedInputParams.visual_prompt === 'string'
      ? normalizedInputParams.visual_prompt.trim()
      : ''
    const voiceId = typeof normalizedInputParams.voice_id === 'string' && normalizedInputParams.voice_id.trim()
      ? normalizedInputParams.voice_id.trim()
      : 'EXAVITQu4vr4xnSDxMaL'
    const speed = Number(normalizedInputParams.speed ?? 1.0)
    const quality = String(normalizedInputParams.quality ?? '720p') === '1080p' ? '1080p' : '720p'
    const speechFieldLooksComposite =
      !ideaPromptInputRaw
      && !expressionDirectionInputRaw
      && !visualPromptInputRaw
      && /[\r\n#]/.test(speechTextInputRaw)
      && /\b(expressao|performance|tom|camera|cena|visual|emoc|luz|ambiente)\b/i.test(speechTextInputRaw)
    const ideaPromptForPolicy = ideaPromptInputRaw || (speechFieldLooksComposite ? speechTextInputRaw : '')
    const speechTextForPolicy = speechFieldLooksComposite ? '' : speechTextInputRaw

    let sourceAssetForPolicy: { type?: string; input_params?: Record<string, unknown> } | undefined
    if (sourceImageUrl) {
      let { data: sourceAssetRow } = await admin
        .from('studio_assets')
        .select('type, input_params')
        .eq('project_id', project_id)
        .eq('user_id', user.id)
        .eq('result_url', sourceImageUrl)
        .maybeSingle()

      if (!sourceAssetRow) {
        const fallbackQuery = await admin
          .from('studio_assets')
          .select('type, input_params')
          .eq('project_id', project_id)
          .eq('user_id', user.id)
          .eq('last_frame_url', sourceImageUrl)
          .maybeSingle()

        sourceAssetRow = fallbackQuery.data ?? null
      }

      sourceAssetForPolicy = sourceAssetRow
        ? {
            type: String(sourceAssetRow.type ?? ''),
            input_params: asRecord(sourceAssetRow.input_params),
          }
        : undefined
    }

    const talkingPolicy = prepareTalkingVideoPrompt({
      mode: talkingVideoMode,
      ideaPrompt: ideaPromptForPolicy,
      speechText: speechTextForPolicy,
      expressionDirection: expressionDirectionInputRaw,
      visualPrompt: visualPromptInputRaw,
      sourceAsset: sourceAssetForPolicy,
    })
    const speechChunkPlan = talkingVideoMode === 'exact_speech'
      ? planTalkingVideoSpeechChunk({
          text: talkingPolicy.speechTextNormalized,
          speed,
          targetSeconds: 7.35,
          maxSeconds: 7.95,
        })
      : planTalkingVideoSpeechChunk({ text: '', speed })
    const continuationIdeaPrompt = speechChunkPlan.hasRemaining
      ? buildTalkingVideoIdeaFromParts({
          speechText: speechChunkPlan.remainingText,
          expressionDirection: talkingPolicy.expressionDirection,
          visualPrompt: talkingPolicy.visualPromptRaw,
        })
      : ''

    normalizedInputParams = {
      ...normalizedInputParams,
      asset_variant: 'talking_video',
      source_image_url: sourceImageUrl ?? '',
      talking_video_mode: talkingVideoMode,
      idea_prompt: talkingPolicy.ideaPrompt,
      idea_prompt_raw: ideaPromptForPolicy,
      composite_input_detected: speechFieldLooksComposite,
      speech_detection_source: talkingPolicy.speechSource,
      speech_text: talkingPolicy.speechTextRaw,
      speech_text_full: talkingPolicy.speechTextRaw,
      speech_text_input_raw: speechTextInputRaw,
      speech_text_raw: talkingPolicy.speechTextRaw,
      speech_text_normalized: talkingPolicy.speechTextNormalized,
      speech_text_full_normalized: talkingPolicy.speechTextNormalized,
      speech_text_chunk: speechChunkPlan.selectedText,
      speech_text_chunk_normalized: speechChunkPlan.selectedText,
      speech_text_remaining: speechChunkPlan.remainingText,
      speech_text_remaining_normalized: speechChunkPlan.remainingText,
      expression_direction: talkingPolicy.expressionDirection,
      expression_direction_input_raw: expressionDirectionInputRaw,
      visual_prompt: talkingPolicy.visualPromptRaw,
      visual_prompt_input_raw: visualPromptInputRaw,
      visual_prompt_raw: talkingPolicy.visualPromptRaw,
      visual_prompt_normalized: talkingPolicy.visualPromptNormalized,
      talking_video_prompt_final: talkingPolicy.finalPrompt,
      voice_id: voiceId,
      speed,
      quality,
      estimated_speech_seconds: speechChunkPlan.fullSeconds || talkingPolicy.estimatedSpeechSeconds,
      estimated_chunk_seconds: speechChunkPlan.selectedSeconds,
      estimated_remaining_speech_seconds: speechChunkPlan.remainingSeconds,
      actual_speech_seconds: null,
      generated_voice_asset_id: String(normalizedInputParams.generated_voice_asset_id ?? ''),
      generated_voice_url: String(normalizedInputParams.generated_voice_url ?? ''),
      talking_video_policy: talkingPolicy.talkingVideoPolicy,
      model_identity_lock: true,
      product_lock_mode: talkingPolicy.productLockMode,
      product_visibility_confidence: talkingPolicy.productVisibilityConfidence,
      scene_freedom_level: talkingPolicy.sceneFreedomLevel,
      camera_motion_policy: talkingPolicy.cameraMotionPolicy,
      removed_directives: talkingPolicy.removedDirectives,
      talking_video_chunked: speechChunkPlan.hasRemaining,
      continuation_available: speechChunkPlan.hasRemaining,
      continuation_idea_prompt: continuationIdeaPrompt,
      pipeline_stage: 'validating',
      pipeline_attempts: incrementTalkingPipelineAttempts(normalizedInputParams.pipeline_attempts, 'validating'),
      idempotency_key: String(normalizedInputParams.idempotency_key ?? crypto.randomUUID()),
    }

    if (!isDraft) {
      if (!sourceImageUrl) {
        return createAssetInputError(
          'talking_video_source_required',
          'Conecte uma imagem base antes de gerar o Video com Fala.',
        )
      }

      if (talkingVideoMode === 'exact_speech' && !talkingPolicy.speechTextRaw) {
        return createAssetInputError(
          'talking_video_speech_required',
          ideaPromptForPolicy || speechFieldLooksComposite
            ? 'Nao consegui detectar a fala exata com seguranca. Coloque a frase entre aspas ou comece pela fala na primeira linha.'
            : 'Escreva a frase que a modelo deve falar no modo Frase exata.',
        )
      }

      if (talkingVideoMode === 'veo_natural' && !talkingPolicy.speechTextRaw && !talkingPolicy.visualPromptRaw) {
        return createAssetInputError(
          'talking_video_prompt_required',
          'Descreva a ideia do video ou cole a fala com a cena desejada antes de gerar.',
        )
      }

      const backendSpeechEstimate = estimateTalkingSpeechDurationSeconds({
        text: talkingPolicy.speechTextNormalized,
        speed,
      })
      normalizedInputParams.estimated_speech_seconds = backendSpeechEstimate
    }
  }

  const baseCost = CREDIT_COST[type] ?? 1
  let effectiveCost = baseCost
  let composePricingPreflight:
    | Awaited<ReturnType<typeof preflightProvadorPricing>>
    | undefined
  if (
    type === 'compose'
    && !isDraft
    && String(normalizedInputParams.compose_variant ?? 'fitting') === 'fitting'
  ) {
    composePricingPreflight = await preflightProvadorPricing({
      product_url: String(normalizedInputParams.product_url ?? ''),
      product_urls: Array.isArray(normalizedInputParams.product_urls)
        ? normalizedInputParams.product_urls.filter((value): value is string => typeof value === 'string')
        : undefined,
      fitting_group: normalizedInputParams.fitting_group ? String(normalizedInputParams.fitting_group) : undefined,
      fitting_category: normalizedInputParams.fitting_category ? String(normalizedInputParams.fitting_category) : undefined,
      vton_category: normalizedInputParams.vton_category ? String(normalizedInputParams.vton_category) : undefined,
    })
    normalizedInputParams = {
      ...normalizedInputParams,
      pricing_strategy: composePricingPreflight.pricingStrategy,
      pricing_tier: composePricingPreflight.pricingTier,
      estimated_provider_cost_usd: composePricingPreflight.estimatedProviderCostUsd,
      estimated_cost_breakdown: composePricingPreflight.estimatedCostBreakdown,
      fitting_strategy: composePricingPreflight.fittingStrategy,
      fitting_group_request_mode: composePricingPreflight.fittingGroupRequestMode,
      fitting_reference_mode: composePricingPreflight.referenceMode,
      fitting_reference_mix_mode: composePricingPreflight.referenceMixMode,
      editorial_finisher_eligible: composePricingPreflight.editorialFinisherEligible,
      preflight_primary_wearable_category: composePricingPreflight.primaryWearableCategory ?? '',
      single_photo_primary_product_type: composePricingPreflight.singlePhotoPrimaryProductType ?? '',
      single_photo_garment_priority_applied: composePricingPreflight.singlePhotoGarmentPriorityApplied ?? false,
      preflight_accessory_detected_types: composePricingPreflight.accessoryDetectedTypes,
      preflight_ignored_prop_types: composePricingPreflight.ignoredPropTypes,
    }
    effectiveCost = composePricingPreflight.creditsCost
  }
  if (type === 'video' && String(normalizedInputParams?.engine ?? '') === 'veo') {
    effectiveCost = CREDIT_COST['video_veo'] ?? 50
  }
  if (type === 'talking_video') {
    const videoCost = CREDIT_COST['video_veo'] ?? 50
    const exactSpeech = String(normalizedInputParams.talking_video_mode ?? 'exact_speech') === 'exact_speech'
    effectiveCost = exactSpeech
      ? videoCost + (CREDIT_COST.voice ?? 8) + (CREDIT_COST.lipsync ?? 20)
      : videoCost
  }
  // Dobra o custo se a qualidade for 1080p HQ
  if (String(normalizedInputParams?.quality ?? '') === '1080p') {
    if (type === 'talking_video') {
      effectiveCost += CREDIT_COST['video_veo'] ?? 50
    } else {
      effectiveCost *= 2
    }
  }
  const { data: profile } = await admin.from('users').select('credits, plan').eq('id', user.id).single()

  // Bloqueia vídeo/animação/lipsync para plano Explorador (free)
  const PAID_PLANS = ['subscription', 'package', 'starter', 'popular', 'pro', 'agency']
  const VIDEO_TYPES = ['video', 'talking_video', 'animate', 'lipsync']
  if (VIDEO_TYPES.includes(type) && !PAID_PLANS.includes(profile?.plan ?? '')) {
    return NextResponse.json({ error: 'Geração de vídeo disponível apenas nos planos pagos. Faça upgrade para continuar.' }, { status: 403 })
  }

  if (!isDraft && (!profile || profile.credits < effectiveCost)) {
    return NextResponse.json({ error: `Saldo insuficiente. Necessário ${effectiveCost} cr.` }, { status: 402 })
  }

  // 2. Registro do Asset (Smart Upsert)
  const status = isDraft ? 'idle' : 'processing'
  const insertData: Record<string, unknown> = {
    project_id, 
    user_id: user.id, 
    type: persistedType,
    status, 
    input_params: normalizedInputParams, 
    credits_cost: isDraft ? 0 : effectiveCost,
    board_order: 0
  }
  if (requestedAssetId) insertData.id = requestedAssetId

  const { data: inserted, error: dbErr } = await admin
    .from('studio_assets')
    .upsert(insertData, { onConflict: 'id' })
    .select()
    .single()
  
  if (dbErr || !inserted) {
    return NextResponse.json({ error: dbErr?.message ?? 'Erro ao criar registro' }, { status: 500 })
  }
  const asset = inserted as StudioAssetRecord
  const responseAsset = mapStudioAssetType(asset as StudioAssetRecord & { type: AssetType; input_params?: Record<string, unknown> })

  await admin
    .from('studio_projects')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', project_id)
    .eq('user_id', user.id)

  // Se for rascunho, para aqui
  if (isDraft) return NextResponse.json({ asset: responseAsset }, { status: 201 })

  // 3. COBRANÇA IMEDIATA (Atomic Debit)
  // Debita antes de gastar com as APIs externas de IA.
  try {
    await admin.rpc('debit_credits_bulk', { 
      user_id_param: user.id, 
      amount_param: effectiveCost 
    })
  } catch (chargeErr: unknown) {
    const chargeMessage = chargeErr instanceof Error ? chargeErr.message : String(chargeErr)
    console.error(`[studio] Falha na cobrança:`, chargeMessage)
    return NextResponse.json({ error: 'Falha ao processar créditos.' }, { status: 500 })
  }

  // 4. Execução da IA
  try {
    let resultUrl: string | null = null
    let extraData: Record<string, unknown> = {}

    if (type === 'image') {
      resultUrl = await generateImage({
        prompt: String(input_params.prompt ?? ''),
        style: String(input_params.style ?? 'ugc'),
        aspect_ratio: String(input_params.aspect_ratio ?? '1:1'),
        model_prompt: input_params.model_prompt ? String(input_params.model_prompt) : undefined,
        source_face_url: input_params.source_face_url ? String(input_params.source_face_url) : undefined,
        assetId: asset.id,
        userId: user.id,
      })
    } else if (type === 'model') {
      const { url, text } = await generateModel({
        gender: String(input_params.gender ?? 'feminino'),
        age_range: String(input_params.age_range ?? '20-30'),
        skin_tone: String(input_params.skin_tone ?? 'media'),
        body_type: String(input_params.body_type ?? 'normal'),
        style: String(input_params.style ?? 'casual'),
        extra_details: input_params.extra_details ? String(input_params.extra_details) : undefined,
        assetId: asset.id,
        userId: user.id,
      })
      resultUrl = url
      extraData = { model_text: text }
    } else if (type === 'script') {
      const { url, text } = await generateScript({
        product: String(input_params.product ?? ''),
        audience: String(input_params.audience ?? ''),
        format: String(input_params.format ?? 'reels'),
        hook_style: String(input_params.hook_style ?? 'problema'),
        assetId: asset.id,
        userId: user.id,
      })
      resultUrl = url
      extraData = { script_text: text }
    } else if (type === 'voice') {
      resultUrl = await generateVoice({
        script: String(input_params.script ?? ''),
        voice_id: String(input_params.voice_id ?? 'EXAVITQu4vr4xnSDxMaL'),
        speed: Number(input_params.speed ?? 1.0),
        assetId: asset.id,
        userId: user.id,
      })
    } else if (type === 'caption') {
      const { url } = await generateCaption({
        audio_url: String(input_params.audio_url ?? ''),
        assetId: asset.id,
        userId: user.id,
      })
      resultUrl = url
    } else if (type === 'upscale') {
      resultUrl = await generateUpscale({
        source_url: String(input_params.source_url ?? ''),
        scale: Number(input_params.scale ?? 4),
        quality: (input_params.quality as '4k' | '8k') ?? '4k',
        assetId: asset.id,
        userId: user.id,
      })
    } else if (type === 'video') {
      const origin    = req.headers.get('origin') ?? req.headers.get('x-forwarded-host')
      const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
      const appUrl    = origin
        ? (origin.startsWith('http') ? origin : `https://${origin}`)
        : (process.env.NEXT_PUBLIC_APP_URL ?? vercelUrl ?? 'http://localhost:3000')

      const AUDIO_EXTS = /\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i
      const continuationFrame = String(input_params.continuation_frame ?? '')
      let sourceImageUrl = String(input_params.source_image_url ?? '')

      // Se houver frame de continuação, tentamos descobrir se ele tem um 'last_frame' (imagem) associado
      if (continuationFrame) {
        if (AUDIO_EXTS.test(continuationFrame)) {
          // É áudio, ignora para source_image
        } else {
          // Tenta buscar no banco se esse frame é o result_url de algum asset, para pegar o 'last_frame_url'
          const { data: linkedAsset } = await admin
            .from('studio_assets')
            .select('last_frame_url, type')
            .eq('result_url', continuationFrame)
            .maybeSingle()

          if (linkedAsset?.last_frame_url && linkedAsset.last_frame_url !== continuationFrame) {
            // Sucesso: pegamos a imagem do último frame em vez do .mp4
            sourceImageUrl = linkedAsset.last_frame_url
          } else {
            // Fallback: se não achou no banco ou não tem imagem, usa o que veio (pode ser o mp4 direto)
            sourceImageUrl = continuationFrame
          }
        }
      }

      if (input_params.engine === 'veo') {
        await startVeo3DirectGoogle({
          source_image_url: sourceImageUrl,
          motion_prompt:    String(normalizedInputParams.motion_prompt_normalized ?? normalizedInputParams.motion_prompt ?? ''),
          model_prompt: normalizedInputParams.model_prompt ? String(normalizedInputParams.model_prompt) : undefined,
          motion_prompt_raw: String(normalizedInputParams.motion_prompt_raw ?? normalizedInputParams.motion_prompt ?? ''),
          motion_prompt_normalized: String(normalizedInputParams.motion_prompt_normalized ?? normalizedInputParams.motion_prompt ?? ''),
          removed_directives: Array.isArray(normalizedInputParams.removed_directives)
            ? normalizedInputParams.removed_directives.filter((value): value is string => typeof value === 'string')
            : [],
          video_lock_policy: String(normalizedInputParams.video_lock_policy ?? ''),
          scene_change_requested: Boolean(normalizedInputParams.scene_change_requested),
          scene_change_blocked: Boolean(normalizedInputParams.scene_change_blocked),
          duration:         Number(input_params.duration ?? 5),
          quality:          String(input_params.quality ?? '720p'),
          assetId:          asset.id,
          userId:           user.id,
        })
      } else {
        await startVideoGeneration({
          source_image_url: sourceImageUrl,
          motion_prompt: String(normalizedInputParams.motion_prompt_normalized ?? normalizedInputParams.motion_prompt ?? ''),
          duration: Number(input_params.duration ?? 5),
          model_prompt: normalizedInputParams.model_prompt ? String(normalizedInputParams.model_prompt) : undefined,
          motion_prompt_raw: String(normalizedInputParams.motion_prompt_raw ?? normalizedInputParams.motion_prompt ?? ''),
          motion_prompt_normalized: String(normalizedInputParams.motion_prompt_normalized ?? normalizedInputParams.motion_prompt ?? ''),
          removed_directives: Array.isArray(normalizedInputParams.removed_directives)
            ? normalizedInputParams.removed_directives.filter((value): value is string => typeof value === 'string')
            : [],
          video_lock_policy: String(normalizedInputParams.video_lock_policy ?? ''),
          scene_change_requested: Boolean(normalizedInputParams.scene_change_requested),
          scene_change_blocked: Boolean(normalizedInputParams.scene_change_blocked),
          assetId: asset.id,
          userId: user.id,
          appUrl,
        })
      }
      return NextResponse.json({ asset: { ...responseAsset, status: 'processing' } }, { status: 201 })

    } else if (type === 'talking_video') {
      const talkingMode = String(normalizedInputParams.talking_video_mode ?? 'exact_speech') === 'veo_natural'
        ? 'veo_natural'
        : 'exact_speech'
      const sourceImageUrl = String(normalizedInputParams.source_image_url ?? '')
      const voiceId = String(normalizedInputParams.voice_id ?? 'EXAVITQu4vr4xnSDxMaL')
      const speed = Number(normalizedInputParams.speed ?? 1.0)
      const quality = String(normalizedInputParams.quality ?? '720p')
      const promptOverride = String(normalizedInputParams.talking_video_prompt_final ?? '')
      let pipelineAttempts = asRecord(normalizedInputParams.pipeline_attempts)

      if (talkingMode === 'exact_speech') {
        let selectedChunkText = String(
          normalizedInputParams.speech_text_chunk_normalized
            ?? normalizedInputParams.speech_text_normalized
            ?? normalizedInputParams.speech_text
            ?? '',
        )
        let remainingSpeechText = String(
          normalizedInputParams.speech_text_remaining_normalized
            ?? normalizedInputParams.speech_text_remaining
            ?? '',
        )
        let generatedVoiceUrl = ''
        let actualSpeechSeconds = 0

        for (let attempt = 0; attempt < 3; attempt += 1) {
          pipelineAttempts = incrementTalkingPipelineAttempts(pipelineAttempts, 'voice_generating')
          await admin.from('studio_assets').update({
            input_params: {
              ...normalizedInputParams,
              speech_text_chunk: selectedChunkText,
              speech_text_chunk_normalized: selectedChunkText,
              speech_text_remaining: remainingSpeechText,
              speech_text_remaining_normalized: remainingSpeechText,
              continuation_available: Boolean(remainingSpeechText),
              continuation_idea_prompt: remainingSpeechText
                ? buildTalkingVideoIdeaFromParts({
                    speechText: remainingSpeechText,
                    expressionDirection: String(normalizedInputParams.expression_direction ?? ''),
                    visualPrompt: String(normalizedInputParams.visual_prompt_raw ?? normalizedInputParams.visual_prompt ?? ''),
                  })
                : '',
              pipeline_stage: 'voice_generating',
              pipeline_attempts: pipelineAttempts,
            },
          }).eq('id', asset.id)

          generatedVoiceUrl = await withStageRetry(
            () => generateVoice({
              script: selectedChunkText,
              voice_id: voiceId,
              speed,
              assetId: `${asset.id}-voice`,
              userId: user.id,
            }),
            { attempts: 2 },
          )

          pipelineAttempts = incrementTalkingPipelineAttempts(pipelineAttempts, 'voice_duration_check')
          await admin.from('studio_assets').update({
            input_params: {
              ...normalizedInputParams,
              speech_text_chunk: selectedChunkText,
              speech_text_chunk_normalized: selectedChunkText,
              speech_text_remaining: remainingSpeechText,
              speech_text_remaining_normalized: remainingSpeechText,
              generated_voice_asset_id: `${asset.id}-voice`,
              generated_voice_url: generatedVoiceUrl,
              pipeline_stage: 'voice_duration_check',
              pipeline_attempts: pipelineAttempts,
            },
          }).eq('id', asset.id)

          actualSpeechSeconds = await measureAudioDurationSeconds(generatedVoiceUrl)
          if (actualSpeechSeconds <= 8) break

          const tightenedPlan = planTalkingVideoSpeechChunk({
            text: selectedChunkText,
            speed,
            targetSeconds: Math.max(5.2, 6.85 - attempt * 0.45),
            maxSeconds: Math.max(6.4, 7.4 - attempt * 0.3),
          })
          const nextChunkText = tightenedPlan.selectedText
          const peeledText = mergeTalkingSpeechText(tightenedPlan.remainingText, remainingSpeechText)

          if (!nextChunkText || nextChunkText === selectedChunkText) {
            throw new Error(`Nao conseguimos encaixar a fala em um take de 8 segundos. A ultima tentativa ficou com ${actualSpeechSeconds.toFixed(1)}s.`)
          }

          selectedChunkText = nextChunkText
          remainingSpeechText = peeledText
        }

        if (actualSpeechSeconds > 8) {
          throw new Error(`Nao conseguimos encaixar a fala em um take de 8 segundos. A ultima tentativa ficou com ${actualSpeechSeconds.toFixed(1)}s.`)
        }

        const continuationIdeaPrompt = remainingSpeechText
          ? buildTalkingVideoIdeaFromParts({
              speechText: remainingSpeechText,
              expressionDirection: String(normalizedInputParams.expression_direction ?? ''),
              visualPrompt: String(normalizedInputParams.visual_prompt_raw ?? normalizedInputParams.visual_prompt ?? ''),
            })
          : ''

        pipelineAttempts = incrementTalkingPipelineAttempts(pipelineAttempts, 'veo_generating')
        await startVeo3DirectGoogle({
          source_image_url: sourceImageUrl,
          motion_prompt: String(normalizedInputParams.visual_prompt_normalized ?? normalizedInputParams.visual_prompt ?? ''),
          prompt_override: promptOverride,
          generate_audio: false,
          duration: 8,
          quality,
          assetId: asset.id,
          userId: user.id,
          inputParamsPatch: {
            generated_voice_asset_id: `${asset.id}-voice`,
            generated_voice_url: generatedVoiceUrl,
            actual_speech_seconds: actualSpeechSeconds,
            speech_text_chunk: selectedChunkText,
            speech_text_chunk_normalized: selectedChunkText,
            speech_text_remaining: remainingSpeechText,
            speech_text_remaining_normalized: remainingSpeechText,
            estimated_chunk_seconds: estimateTalkingSpeechDurationSeconds({ text: selectedChunkText, speed }),
            estimated_remaining_speech_seconds: estimateTalkingSpeechDurationSeconds({ text: remainingSpeechText, speed }),
            talking_video_chunked: Boolean(remainingSpeechText),
            continuation_available: Boolean(remainingSpeechText),
            continuation_idea_prompt: continuationIdeaPrompt,
            pipeline_stage: 'veo_generating',
            pipeline_attempts: pipelineAttempts,
          },
        })
      } else {
        pipelineAttempts = incrementTalkingPipelineAttempts(pipelineAttempts, 'veo_generating')
        await startVeo3DirectGoogle({
          source_image_url: sourceImageUrl,
          motion_prompt: String(normalizedInputParams.visual_prompt_normalized ?? normalizedInputParams.visual_prompt ?? ''),
          prompt_override: promptOverride,
          generate_audio: true,
          duration: 8,
          quality,
          assetId: asset.id,
          userId: user.id,
          inputParamsPatch: {
            pipeline_stage: 'veo_generating',
            pipeline_attempts: pipelineAttempts,
          },
        })
      }

      return NextResponse.json({ asset: { ...responseAsset, status: 'processing' } }, { status: 201 })

    } else if (type === 'animate') {
      const appUrl = resolveAppUrl(req)
      await startAnimateGeneration({
        portrait_image_url: String(input_params.portrait_image_url ?? ''),
        driving_video_url:  String(input_params.driving_video_url  ?? ''),
        motion_prompt: input_params.motion_prompt ? String(input_params.motion_prompt) : undefined,
        assetId: asset.id,
        userId: user.id,
        appUrl,
      })
      return NextResponse.json({ asset: { ...responseAsset, status: 'processing' } }, { status: 201 })

    } else if (type === 'lipsync') {
      const appUrl = resolveAppUrl(req)

      await startLipsyncGeneration({
        face_url:  String(input_params.face_url  ?? ''),
        audio_url: String(input_params.audio_url ?? ''),
        assetId: asset.id,
        userId:  user.id,
        appUrl,
      })
      return NextResponse.json({ asset: { ...responseAsset, status: 'processing' } }, { status: 201 })

    } else if (type === 'compose') {
      const composeVariant = String(normalizedInputParams.compose_variant ?? 'fitting')
      const composeMode = String(normalizedInputParams.compose_mode ?? 'try-on')
      const composeResult = await composeProductScene({
        portrait_url:  String(normalizedInputParams.portrait_url   ?? ''),
        product_url:   String(normalizedInputParams.product_url    ?? ''),
        product_urls:  Array.isArray(normalizedInputParams.product_urls)
          ? normalizedInputParams.product_urls.filter((value): value is string => typeof value === 'string')
          : undefined,
        guided_overlay_references: Array.isArray(normalizedInputParams.guided_overlay_references)
          ? normalizedInputParams.guided_overlay_references
              .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value))
          : undefined,
        compose_mode:  composeVariant === 'fitting' ? 'gemini' : composeMode,
        compose_variant: composeVariant,
        position:      normalizedInputParams.position ? String(normalizedInputParams.position) : 'southeast',
        product_scale: normalizedInputParams.product_scale ? Number(normalizedInputParams.product_scale) : 0.35,
        aspect_ratio: normalizedInputParams.aspect_ratio ? String(normalizedInputParams.aspect_ratio) : '9:16',
        vton_category: normalizedInputParams.vton_category ? String(normalizedInputParams.vton_category) : undefined,
        fitting_category: normalizedInputParams.fitting_category ? String(normalizedInputParams.fitting_category) : undefined,
        fitting_group: normalizedInputParams.fitting_group ? String(normalizedInputParams.fitting_group) : undefined,
        fitting_pose_preset: normalizedInputParams.fitting_pose_preset ? String(normalizedInputParams.fitting_pose_preset) : undefined,
        fitting_energy_preset: normalizedInputParams.fitting_energy_preset ? String(normalizedInputParams.fitting_energy_preset) : undefined,
        costume_prompt: normalizedInputParams.costume_prompt ? String(normalizedInputParams.costume_prompt) : undefined,
        smart_prompt:  normalizedInputParams.smart_prompt ? String(normalizedInputParams.smart_prompt) : undefined,
        pricing_preflight: composeVariant === 'fitting' ? composePricingPreflight : undefined,
        assetId: asset.id,
        userId:  user.id,
      })
      resultUrl = composeResult.url
      extraData = { ...extraData, ...(composeResult.extraData ?? {}) }
    } else if (type === 'music') {
      resultUrl = await generateMusic({
        prompt: String(input_params.prompt ?? ''),
        source_image_url: input_params.source_image_url ? String(input_params.source_image_url) : undefined,
        assetId: asset.id,
        userId: user.id
      })
    } else if (type === 'ugc_bundle') {
      try {
        const sourceUrl = String(input_params.source_url ?? '')
        if (!sourceUrl) throw new Error('Imagem de origem (source_url) é obrigatória para gerar o pacote.')

        const positions = await generateUGCPositions({
          sourceUrl,
          assetId: asset.id,
          userId: user.id,
        })
        
        if (!positions || positions.length === 0) {
          throw new Error('O Google Vertex AI não conseguiu gerar as fotos. Verifique se o Project ID e a Permissão da Service Account estão corretos no Vercel.')
        }

        resultUrl = positions[0].url || null
        extraData = { ugc_bundle: positions }
      } catch (bundleErr: unknown) {
        const bundleMessage = bundleErr instanceof Error ? bundleErr.message : String(bundleErr)
        console.error('[studio] Erro específico no bundle:', bundleErr)
        throw new Error(`Falha no Bundle UGC: ${bundleMessage}`)
      }
    } else if (type === 'look_split') {
      const splitResult = await splitLookReferences({
        source_url: String(normalizedInputParams.source_url ?? ''),
        smart_prompt: typeof normalizedInputParams.smart_prompt === 'string' ? normalizedInputParams.smart_prompt : undefined,
        assetId: asset.id,
        userId: user.id,
      })
      resultUrl = splitResult.url
      extraData = { ...extraData, ...(splitResult.extraData ?? {}) }
    } else if (type === 'scene') {
      const extraUrls = Array.isArray(input_params.extra_source_urls)
        ? (input_params.extra_source_urls as string[]).filter(u => typeof u === 'string' && u.startsWith('http'))
        : []
      resultUrl = await generateScene({
        source_url: String(input_params.source_url ?? ''),
        extra_source_urls: extraUrls,
        scene_prompt: String(input_params.scene_prompt ?? ''),
        aspect_ratio: String(input_params.aspect_ratio ?? '9:16'),
        assetId: asset.id,
        userId: user.id,
      })
    } else if (type === 'angles') {
      resultUrl = await generateAngles({
        source_url: String(input_params.source_url ?? ''),
        angle: String(input_params.angle ?? 'frontal'),
        engine: String(input_params.engine ?? 'flux'),
        aspect_ratio: String(input_params.aspect_ratio ?? '9:16'),
        assetId: asset.id,
        userId: user.id,
      })
    } else if (type === 'render') {
      resultUrl = await mergeVideoAudio({
        video_url: String(input_params.source_image_url ?? ''),
        audio_url: String(input_params.audio_url ?? ''),
        assetId: asset.id,
        userId: user.id,
      })
    } else if (type === 'face') {
      resultUrl = String(input_params.face_image_url ?? '')
    } else if (type === 'join') {
      const rawUrls = input_params.video_urls
      const videoUrls: string[] = Array.isArray(rawUrls) ? rawUrls.filter(Boolean).map(String) : []
      resultUrl = await joinVideos({ video_urls: videoUrls, assetId: asset.id, userId: user.id })
    }

    // 5. Finalização (Sync Types Only)
    await admin.from('studio_assets').update({
      status: 'done',
      result_url: resultUrl,
      input_params: { ...normalizedInputParams, ...extraData },
    }).eq('id', asset.id)

    return NextResponse.json({
      asset: {
        ...responseAsset,
        status: 'done',
        result_url: resultUrl,
        input_params: { ...normalizedInputParams, ...extraData },
      }
    }, { status: 201 })

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    const errorStack = err instanceof Error ? err.stack : ''
    const failureMetadata =
      err && typeof err === 'object'
        ? err as {
            studioFailureData?: Record<string, unknown>
            studioRefundReason?: string
          }
        : {}
    const supportDebugId = typeof normalizedInputParams.support_debug_id === 'string' && normalizedInputParams.support_debug_id.trim().length > 0
      ? normalizedInputParams.support_debug_id
      : `studio_${crypto.randomUUID().slice(0, 8)}`
    const publicError = buildStudioPublicErrorEnvelope({
      type,
      inputParams: {
        ...normalizedInputParams,
        ...(failureMetadata.studioFailureData ?? {}),
      },
      errorMsg,
      supportDebugId,
    })
    const failureInputParams: Record<string, unknown> = {
      ...normalizedInputParams,
      ...(failureMetadata.studioFailureData ?? {}),
      public_error_code: publicError.code,
      public_error_title: publicError.title,
      public_error_message: publicError.message,
      support_debug_id: publicError.supportDebugId,
    }
    
    console.error(`[studio] CRITICAL ERROR [Asset ${asset?.id}]:`, {
      message: errorMsg,
      stack: errorStack,
      type,
      input_params: failureInputParams
    })

    if (asset?.id) {
      await markStudioAssetFailed({
        admin,
        assetId: asset.id,
        errorMsg,
        refundReason: failureMetadata.studioRefundReason ?? `sync-post:${type}`,
        extraInputParams: failureInputParams,
        publicErrorCode: publicError.code,
        publicErrorTitle: publicError.title,
        publicErrorMessage: publicError.message,
        supportDebugId: publicError.supportDebugId,
      })
    }

    if (type === 'compose' && asset?.id && typeof failureInputParams.failure_state === 'string') {
      const { data: updatedAsset, error: updatedAssetError } = await admin
        .from('studio_assets')
        .select('*')
        .eq('id', asset.id)
        .maybeSingle()

      if (!updatedAssetError && updatedAsset) {
        return NextResponse.json({
          asset: mapStudioAssetType(updatedAsset),
          guided: true,
        }, { status: 201 })
      }
    }
    
    return NextResponse.json({ 
      error: publicError.code,
      message: publicError.message,
      public_error_code: publicError.code,
      public_error_title: publicError.title,
      public_error_message: publicError.message,
      support_debug_id: publicError.supportDebugId,
      code: 'INTERNAL_SERVER_ERROR',
      asset_id: asset?.id 
    }, { status: 500 })
  }
}
