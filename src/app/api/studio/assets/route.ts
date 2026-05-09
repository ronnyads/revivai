export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CREDIT_COST, deriveVideoScenePrepassPrompt, generateImageGoogle, generateScriptGoogle, generateVoiceGoogle, generateCaptionGoogle, generateUpscale, startVideoGeneration, startVeo3DirectGoogle, generateModelGoogle, mergeVideoAudio, startAnimateGeneration, composeProductScene, startLipsyncGeneration, joinVideosRobust, generateAngles, generateMusicGoogle, generateUGCPositions, generateSceneVertexOnly, splitLookReferences, prepareLockedVideoMotionPrompt, prepareScenePromptPolicy, prepareTalkingVideoPrompt, estimateTalkingSpeechDurationSeconds, incrementTalkingPipelineAttempts, startTalkingVideoMotionGeneration, generateVoiceGrok, startGrokVideoGeneration } from '@/lib/studio'
import { markStudioAssetFailed } from '@/lib/studioAssetFailure'
import { resolveStudioPublicError, type StudioPublicErrorEnvelope } from '@/lib/studioPublicErrors'
import { getLogicalStudioAssetType, getPersistedStudioAssetType, mapStudioAssetType } from '@/lib/studioAssetType'
import { applyStudioEngineMetadata, assertStudioAssetExecutionReady, normalizeStudioEngineInputParams, resolveStudioAssetEnginePolicy, StudioEnginePolicyError } from '@/lib/studioEngineRegistry'
import { AssetType } from '@/types'
import { checkRateLimit } from '@/lib/rateLimit'
import { getVideoGenerationCost, normalizeStudioVideoQuality } from '@/constants/studio'
import {
  buildTalkingVideoIdeaFromParts,
  calculateTalkingVideoCredits,
  normalizeTalkingWhitespace,
  parseTalkingVideoIdeaInput,
  planTalkingVideoSpeechChunk,
  planAllTalkingVideoChunks,
  type TalkingVideoAudioSource,
  type TalkingVideoChunkItem,
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

function logProductSovereigntyBlock(params: {
  type: 'video' | 'talking_video'
  userId: string
  projectId: string
  sourceUrl?: string
  prompt: string
  details?: Record<string, unknown>
}) {
  console.warn('[studio] product_change_not_allowed', JSON.stringify({
    type: params.type,
    userId: params.userId,
    projectId: params.projectId,
    sourceUrl: params.sourceUrl ?? '',
    promptPreview: params.prompt.slice(0, 280),
    ...params.details,
  }))
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function dedupeNormalizedStrings(values: Array<unknown>) {
  return Array.from(new Set(
    values
      .map((value) => String(value ?? '').trim())
      .filter(Boolean),
  ))
}

function inferSceneSourcePolicy(sourceAsset?: {
  type?: string
  input_params?: Record<string, unknown>
}) {
  const inputParams = sourceAsset?.input_params ?? {}
  const sourceVisibleItemManifest = dedupeNormalizedStrings([
    ...(Array.isArray(inputParams.submitted_item_manifest) ? inputParams.submitted_item_manifest : []),
    ...(Array.isArray(inputParams.source_visible_item_manifest) ? inputParams.source_visible_item_manifest : []),
    ...(Array.isArray(inputParams.submitted_non_fashion_items) ? inputParams.submitted_non_fashion_items : []),
  ]).slice(0, 16)

  return {
    sourceFidelityMode: 'strict' as const,
    preserveAllVisibleSourceItems: inputParams.preserve_all_visible_source_items !== false,
    sourceVisibleItemManifest,
    sourceTextLogoLock: inputParams.source_text_logo_lock !== false,
    sourceColorLock: inputParams.source_color_lock !== false,
  }
}

async function loadSourceAssetForPolicy(params: {
  admin: ReturnType<typeof createAdminClient>
  projectId: string
  userId: string
  sourceUrl?: string
}) {
  const sourceUrl = normalizeOptionalUrl(params.sourceUrl)
  if (!sourceUrl) return undefined

  let { data: sourceAssetRow } = await params.admin
    .from('studio_assets')
    .select('type, input_params')
    .eq('project_id', params.projectId)
    .eq('user_id', params.userId)
    .eq('result_url', sourceUrl)
    .maybeSingle()

  if (!sourceAssetRow) {
    const fallbackQuery = await params.admin
      .from('studio_assets')
      .select('type, input_params')
      .eq('project_id', params.projectId)
      .eq('user_id', params.userId)
      .eq('last_frame_url', sourceUrl)
      .maybeSingle()

    sourceAssetRow = fallbackQuery.data ?? null
  }

  return sourceAssetRow
    ? {
        type: String(sourceAssetRow.type ?? ''),
        input_params: asRecord(sourceAssetRow.input_params),
      }
    : sourceUrl
      ? {
          type: 'direct_upload_source',
          input_params: {
            source_origin: 'direct_upload',
            force_strict_source_fidelity: true,
            preserve_all_visible_source_items: true,
            source_text_logo_lock: true,
            source_color_lock: true,
          },
        }
      : undefined
}

export function legacyShouldTalkingVideoPreResolveScene(params: {
  sourceFidelityMode?: unknown
  visualPrompt?: unknown
  ideaPrompt?: unknown
}) {
  if (String(params.sourceFidelityMode ?? '') !== 'strict') return false

  const prompt = mergeTalkingSpeechText(
    typeof params.visualPrompt === 'string' ? params.visualPrompt : '',
    typeof params.ideaPrompt === 'string' ? params.ideaPrompt : '',
  )
  if (!prompt) return false

  return (
    prompt.length >= 220
    || /\b(storyboard|roteiro|take|shot|seg(?:\.|undos?)?|close|close-up|close up)\b/i.test(prompt)
    || /\b(cama|criado-mudo|criado mudo|janela|window|bed|bedside|nightstand|praia|beach|podcast|microfone|escritorio|office|mesa|quarto|hotel|cafe|caf[eé])\b/i.test(prompt)
    || /\b(acorda|se espreguica|se espreguiça|se levanta|vai em direcao|vai em direção|walking|walks|gets up|stands up|vira para a camera|vira para camera)\b/i.test(prompt)
  )
}

const TALKING_VIDEO_SCENE_CHANGE_PATTERNS = [
  /\b(trocar|mudar|substituir|colocar|levar|passar|transformar|move|put|set)\b.{0,48}\b(cenario|cenário|fundo|ambiente|location|setting|praia|beach|podcast|microfone|escritorio|escritório|office|quarto|hotel|cafe|caf[eé]|restaurante|rua|street)\b/i,
  /\b(agora|coloca|deixa)\b.{0,24}\b(no|na|em)\b.{0,24}\b(praia|beach|podcast|escritorio|escritório|office|quarto|hotel|cafe|caf[eé]|restaurante|rua|street)\b/i,
]

const TALKING_VIDEO_WARDROBE_CHANGE_PATTERNS = [
  /\b(trocar|mudar|substituir|colocar|usar|vestir|deixar com)\b.{0,48}\b(roupa|look|outfit|jaqueta|blazer|vestido|dress|camiseta|camisa|shirt|blusa|calca|calça|pants|saia|skirt|sapato|shoes|tenis|tênis)\b/i,
]

const TALKING_VIDEO_PRODUCT_CHANGE_PATTERNS = [
  /\b(trocar|mudar|substituir|replace|swap)\b.{0,48}\b(produto|product|caneca|mug|garrafa|bottle|item|embalagem|packaging|logo|branding)\b/i,
]

function detectTalkingVideoSourceChanges(params: {
  scenePresetId?: string
  visualPrompt?: string
  ideaPrompt?: string
}) {
  const mergedPrompt = mergeTalkingSpeechText(params.visualPrompt, params.ideaPrompt)
  const scenePresetId = String(params.scenePresetId ?? 'none').trim().toLowerCase()

  return {
    requestedSceneChange:
      (scenePresetId !== '' && scenePresetId !== 'none')
      || TALKING_VIDEO_SCENE_CHANGE_PATTERNS.some((pattern) => pattern.test(mergedPrompt)),
    requestedWardrobeChange:
      TALKING_VIDEO_WARDROBE_CHANGE_PATTERNS.some((pattern) => pattern.test(mergedPrompt)),
    requestedProductChange:
      TALKING_VIDEO_PRODUCT_CHANGE_PATTERNS.some((pattern) => pattern.test(mergedPrompt)),
  }
}

function shouldTalkingVideoPreResolveScene(params: {
  requestedSceneChange?: boolean
  requestedWardrobeChange?: boolean
}) {
  return Boolean(params.requestedSceneChange || params.requestedWardrobeChange)
}

function buildStudioPublicErrorEnvelope(params: {
  type?: AssetType
  inputParams?: Record<string, unknown>
  errorMsg: string
  supportDebugId: string
}): StudioPublicErrorEnvelope {
  const inputParams = params.inputParams ?? {}
  const forcedPublicCode = typeof inputParams.public_error_code === 'string' ? inputParams.public_error_code.trim() : ''
  const forcedPublicTitle = typeof inputParams.public_error_title === 'string' ? inputParams.public_error_title.trim() : ''
  const forcedPublicMessage = typeof inputParams.public_error_message === 'string' ? inputParams.public_error_message.trim() : ''
  const composeVariant = typeof inputParams.compose_variant === 'string' ? inputParams.compose_variant : ''
  const failureState = typeof inputParams.failure_state === 'string' ? inputParams.failure_state : ''
  const technicalMessage = params.errorMsg.toLowerCase()

  if (forcedPublicCode || forcedPublicTitle || forcedPublicMessage) {
    return resolveStudioPublicError({
      code: forcedPublicCode || 'falha_na_geracao',
      title: forcedPublicTitle || undefined,
      message: forcedPublicMessage || undefined,
      supportDebugId: params.supportDebugId,
    })
  }

  if (params.type === 'compose' && composeVariant === 'fitting') {
    const referenceMergeResult = typeof inputParams.reference_merge_result === 'string' ? inputParams.reference_merge_result : ''
    if (failureState === 'scene_white_studio_reference_conflict' || failureState === 'guided_reference_conflict') {
      if (referenceMergeResult === 'same_zone_unmergeable') {
        return resolveStudioPublicError({
          code: 'referencias_conflitantes',
          message: 'As referencias da mesma peca nao puderam ser conciliadas com seguranca. Tente refs mais coerentes da mesma peca ou separe em cards diferentes.',
          supportDebugId: params.supportDebugId,
        })
      }
      return resolveStudioPublicError({
        code: 'referencias_conflitantes',
        message: 'As referencias enviadas parecem disputar a mesma parte do look. Envie refs complementares ou separe os itens em cards diferentes.',
        supportDebugId: params.supportDebugId,
      })
    }

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
  'fitting_engine',
  'white_studio_lock',
  'required_all_submitted_items',
  'submitted_item_categories',
  'submitted_non_fashion_items',
  'submitted_item_manifest',
  'missing_or_distorted_items',
  'generation_budget_profile',
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
  const userId = user.id

  // ── Rate limit ──
  if (!checkRateLimit(userId, 'studio-asset', { max: 60, windowMs: 60_000 })) {
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
  if (!project || project.user_id !== userId) {
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
      if (ownedAsset.user_id !== userId || ownedAsset.project_id !== project_id) {
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

  if (type === 'scene') {
    const sourceUrl = normalizeOptionalUrl(normalizedInputParams.source_url)
    const extraSourceUrls = Array.isArray(normalizedInputParams.extra_source_urls)
      ? normalizedInputParams.extra_source_urls
        .filter((value): value is string => typeof value === 'string' && isValidHttpUrl(value.trim()))
        .map((value) => value.trim())
        .slice(0, 5)
      : []
    const scenePrompt = typeof normalizedInputParams.scene_prompt === 'string'
      ? normalizedInputParams.scene_prompt.trim()
      : ''
    const aspectRatio = typeof normalizedInputParams.aspect_ratio === 'string' && normalizedInputParams.aspect_ratio.trim().length > 0
      ? normalizedInputParams.aspect_ratio.trim()
      : '9:16'
    const sourceAssetForPolicy = await loadSourceAssetForPolicy({
      admin,
      projectId: project_id,
      userId: user.id,
      sourceUrl: sourceUrl ?? extraSourceUrls[0],
    })
    const sceneSourcePolicy = inferSceneSourcePolicy(sourceAssetForPolicy)
    const scenePromptPolicy = prepareScenePromptPolicy({
      scenePrompt,
      aspectRatio,
      requestedSceneChange: Boolean(normalizedInputParams.requested_scene_change),
      requestedWardrobeChange: Boolean(normalizedInputParams.requested_wardrobe_change),
      requestedBodyReframe: Boolean(normalizedInputParams.requested_body_reframe),
      sourceVisibleItemManifest: sceneSourcePolicy.sourceVisibleItemManifest,
      requireExactTextLogo: sceneSourcePolicy.sourceTextLogoLock,
      requireExactColor: sceneSourcePolicy.sourceColorLock,
      strictSourceFidelity: sceneSourcePolicy.sourceFidelityMode === 'strict',
      referenceSwapCount: extraSourceUrls.length,
    })

    normalizedInputParams = {
      ...normalizedInputParams,
      source_url: sourceUrl ?? '',
      extra_source_urls: extraSourceUrls,
      scene_prompt: scenePrompt,
      aspect_ratio: aspectRatio,
      requested_scene_change: scenePromptPolicy.requestedSceneChange,
      requested_wardrobe_change: scenePromptPolicy.requestedWardrobeChange,
      requested_body_reframe: scenePromptPolicy.requestedBodyReframe,
      requested_identity_change: scenePromptPolicy.requestedIdentityChange,
      requested_product_change: scenePromptPolicy.requestedProductChange,
      scene_edit_policy: scenePromptPolicy.editMode,
      scene_swap_task: scenePromptPolicy.swapTask,
      scene_reference_swap_enabled: scenePromptPolicy.allowReferenceSwap,
      scene_reference_swap_count: scenePromptPolicy.swapReferenceCount,
      source_fidelity_mode: sceneSourcePolicy.sourceFidelityMode,
      preserve_all_visible_source_items: sceneSourcePolicy.preserveAllVisibleSourceItems,
      source_visible_item_manifest: sceneSourcePolicy.sourceVisibleItemManifest,
      source_text_logo_lock: sceneSourcePolicy.sourceTextLogoLock,
      source_color_lock: sceneSourcePolicy.sourceColorLock,
    }

    if (!isDraft) {
      if (!sourceUrl) {
        return createAssetInputError(
          'scene_source_required',
          'Conecte uma imagem base antes de usar o Cena Livre.',
        )
      }

      if (!isValidHttpUrl(sourceUrl)) {
        return createAssetInputError(
          'scene_source_invalid',
          'A imagem base do Cena Livre esta invalida. Atualize o card e tente novamente.',
        )
      }

      if (!scenePrompt) {
        return createAssetInputError(
          'scene_prompt_required',
          'Descreva a alteracao desejada no Cena Livre antes de gerar.',
        )
      }

      if (scenePromptPolicy.requestedIdentityChange) {
        return createAssetInputError(
          'scene_identity_change_not_allowed',
          'O Cena Livre preserva exatamente a mesma modelo. Para trocar rosto, idade, corpo ou identidade, use outro fluxo.',
        )
      }

      if (scenePromptPolicy.shouldBlockProtectedElementChange) {
        return createAssetInputError(
          'scene_protected_elements_locked',
          'Para trocar produto, logo, texto, cor ou objeto no Cena Livre, envie uma referencia extra dessa nova peca junto com o prompt.',
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
    const quality = normalizeStudioVideoQuality(normalizedInputParams.quality)
    const sourceAssetForPolicy = await loadSourceAssetForPolicy({
      admin,
      projectId: project_id,
      userId: user.id,
      sourceUrl: sourceImageUrl ?? continuationFrame,
    })
    const videoPromptPolicy = prepareLockedVideoMotionPrompt({
      motionPrompt: motionPromptRaw,
      modelPrompt: modelPrompt || undefined,
      sourceAsset: sourceAssetForPolicy,
    })

    normalizedInputParams = {
      ...normalizedInputParams,
      source_image_url: sourceImageUrl ?? '',
      continuation_frame: continuationFrame ?? '',
      motion_prompt: motionPromptRaw,
      quality,
      motion_prompt_raw: videoPromptPolicy.rawPrompt,
      motion_prompt_normalized: videoPromptPolicy.normalizedPrompt,
      video_prompt_mode: videoPromptPolicy.promptMode,
      video_audio_mode: videoPromptPolicy.audioMode,
      video_dialogue_language: videoPromptPolicy.dialogueLanguage,
      video_dialogue_line: videoPromptPolicy.dialogueLine,
      requested_product_change: videoPromptPolicy.productChangeRequested,
      protected_elements_preserved: videoPromptPolicy.protectedElementsPreserved,
      video_lock_policy: videoPromptPolicy.videoLockPolicy,
      scene_change_requested: videoPromptPolicy.sceneChangeRequested,
      scene_change_blocked: false,
      video_scene_prepass_skipped_reason: '',
      removed_directives: videoPromptPolicy.removedDirectives,
      source_fidelity_mode: videoPromptPolicy.sourceFidelityMode,
      source_visible_item_manifest: videoPromptPolicy.sourceVisibleItemManifest,
      source_text_logo_lock: videoPromptPolicy.sourceTextLogoLock,
      source_color_lock: videoPromptPolicy.sourceColorLock,
      generate_audio: videoPromptPolicy.audioMode === 'native_veo_audio',
      scene_livre: Boolean(input_params.scene_livre),
    }

    if (!isDraft) {
      if (!sourceImageUrl && !continuationFrame) {
        return createAssetInputError(
          'source_image_url_required',
          'Conecte uma imagem base ou uma continuacao antes de gerar o video.',
        )
      }

      if (videoPromptPolicy.productChangeRequested) {
        logProductSovereigntyBlock({
          type: 'video',
          userId: user.id,
          projectId: project_id,
          sourceUrl: sourceImageUrl ?? continuationFrame ?? '',
          prompt: motionPromptRaw,
          details: {
            sourceAssetType: sourceAssetForPolicy?.type ?? 'direct_upload_source',
            sourceFidelityMode: videoPromptPolicy.sourceFidelityMode,
            protectedElementsPreserved: videoPromptPolicy.protectedElementsPreserved,
          },
        })
        return createAssetInputError(
          'product_change_not_allowed',
          'Esse card preserva exatamente o produto da imagem base. Para trocar produto, logo, texto, embalagem ou cor, gere uma nova imagem ou cena primeiro.',
        )
      }
    }
  }

  let allSpeechChunks: TalkingVideoChunkItem[] = []

  if (type === 'talking_video') {
    const sourceImageUrl = normalizeOptionalUrl(normalizedInputParams.source_image_url)
    const externalAudioUrl = normalizeOptionalUrl(normalizedInputParams.audio_url)
    const hasExternalAudio = Boolean(externalAudioUrl)
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
    const quality = normalizeStudioVideoQuality(normalizedInputParams.quality)
    const speechFieldLooksComposite =
      !ideaPromptInputRaw
      && !expressionDirectionInputRaw
      && !visualPromptInputRaw
      && /[\r\n#]/.test(speechTextInputRaw)
      && /\b(expressao|performance|tom|camera|cena|visual|emoc|luz|ambiente)\b/i.test(speechTextInputRaw)
    const ideaPromptForPolicy = ideaPromptInputRaw || (speechFieldLooksComposite ? speechTextInputRaw : '')
    const speechTextForPolicy = speechFieldLooksComposite ? '' : speechTextInputRaw
    const scenePresetId = typeof normalizedInputParams.scene_preset_id === 'string'
      ? normalizedInputParams.scene_preset_id.trim().toLowerCase()
      : 'none'
    const parsedTalkingIdea = parseTalkingVideoIdeaInput({
      mode: talkingVideoMode,
      ideaPrompt: ideaPromptForPolicy,
      speechText: speechTextForPolicy,
      expressionDirection: expressionDirectionInputRaw,
      visualPrompt: visualPromptInputRaw,
    })
    const requestedSourceChanges = detectTalkingVideoSourceChanges({
      scenePresetId,
      visualPrompt: parsedTalkingIdea.visualPrompt,
      ideaPrompt: ideaPromptForPolicy,
    })

    const sourceAssetForPolicy = await loadSourceAssetForPolicy({
      admin,
      projectId: project_id,
      userId: user.id,
      sourceUrl: sourceImageUrl,
    })

    const talkingPolicy = prepareTalkingVideoPrompt({
      mode: talkingVideoMode,
      ideaPrompt: ideaPromptForPolicy,
      speechText: speechTextForPolicy,
      expressionDirection: expressionDirectionInputRaw,
      visualPrompt: visualPromptInputRaw,
      requestedSceneChange: requestedSourceChanges.requestedSceneChange,
      requestedWardrobeChange: requestedSourceChanges.requestedWardrobeChange,
      sourceAsset: sourceAssetForPolicy,
    })
    const requestedProductChange =
      requestedSourceChanges.requestedProductChange
      || talkingPolicy.productChangeRequested
    const speechChunkPlan = talkingVideoMode === 'exact_speech'
      ? planTalkingVideoSpeechChunk({
          text: talkingPolicy.speechTextNormalized,
          speed,
          targetSeconds: 7.35,
          maxSeconds: 7.95,
        })
      : planTalkingVideoSpeechChunk({ text: '', speed })
    // Siblings da chain já têm chunk próprio — não replanejar o texto completo
    const isChainChild = Boolean(normalizedInputParams.is_chain_child)
    allSpeechChunks = (talkingVideoMode === 'exact_speech' && !isChainChild)
      ? planAllTalkingVideoChunks({
          text: talkingPolicy.speechTextNormalized,
          speed,
          targetSeconds: 7.35,
          maxSeconds: 7.95,
        })
      : []
    const continuationIdeaPrompt = speechChunkPlan.hasRemaining
      ? buildTalkingVideoIdeaFromParts({
          speechText: speechChunkPlan.remainingText,
          expressionDirection: talkingPolicy.expressionDirection,
          visualPrompt: talkingPolicy.visualPromptRaw,
        })
      : ''
    const talkingVideoRequiresVoicePipeline = hasExternalAudio || talkingVideoMode === 'exact_speech'
    const audioGenerationRequested = talkingVideoMode === 'veo_natural' && !hasExternalAudio
    const talkingVideoAudioSource: TalkingVideoAudioSource = hasExternalAudio
      ? 'connected_audio'
      : audioGenerationRequested
        ? 'veo_native'
        : talkingVideoMode === 'exact_speech'
          ? 'generated_tts'
          : 'none'
    const talkingVideoDeliveryMode = hasExternalAudio
      ? 'external_audio_lipsync'
      : audioGenerationRequested
        ? 'native_veo_audio'
        : talkingVideoMode === 'exact_speech'
          ? 'external_audio_lipsync'
          : 'silent_veo_only'

    normalizedInputParams = {
      ...normalizedInputParams,
      asset_variant: 'talking_video',
      source_image_url: sourceImageUrl ?? '',
      audio_url: externalAudioUrl ?? '',
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
      scene_preset_id: scenePresetId || 'none',
      requested_scene_change: requestedSourceChanges.requestedSceneChange,
      requested_wardrobe_change: requestedSourceChanges.requestedWardrobeChange,
      requested_product_change: requestedProductChange,
      motion_provider_fallback_used: false,
      motion_provider_chain: Array.isArray(normalizedInputParams.motion_provider_chain)
        ? normalizedInputParams.motion_provider_chain.filter((value): value is string => typeof value === 'string')
        : [],
      model_identity_lock: true,
      product_lock_mode: talkingPolicy.productLockMode,
      product_visibility_confidence: talkingPolicy.productVisibilityConfidence,
      source_fidelity_mode: talkingPolicy.strictSourceFidelity ? 'strict' : talkingPolicy.productLockMode,
      source_text_logo_lock: talkingPolicy.sourceTextLogoLock,
      source_color_lock: talkingPolicy.sourceColorLock,
      preserve_all_visible_source_items: talkingPolicy.preserveAllVisibleSourceItems,
      source_visible_item_manifest: talkingPolicy.sourceVisibleItemManifest,
      scene_freedom_level: talkingPolicy.sceneFreedomLevel,
      camera_motion_policy: talkingPolicy.cameraMotionPolicy,
      talking_video_scene_presolve_required: shouldTalkingVideoPreResolveScene({
        requestedSceneChange: requestedSourceChanges.requestedSceneChange,
        requestedWardrobeChange: requestedSourceChanges.requestedWardrobeChange,
      }),
      talking_video_scene_presolved: false,
      talking_video_has_external_audio: hasExternalAudio,
      talking_video_requires_voice_pipeline: talkingVideoRequiresVoicePipeline,
      talking_video_audio_source: talkingVideoAudioSource,
      talking_video_delivery_mode: talkingVideoDeliveryMode,
      audio_generation_requested: audioGenerationRequested,
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

      if (requestedProductChange) {
        logProductSovereigntyBlock({
          type: 'talking_video',
          userId: user.id,
          projectId: project_id,
          sourceUrl: sourceImageUrl ?? '',
          prompt: mergeTalkingSpeechText(ideaPromptForPolicy, visualPromptInputRaw),
          details: {
            mode: talkingVideoMode,
            sourceAssetType: sourceAssetForPolicy?.type ?? 'direct_upload_source',
            sourceFidelityMode: talkingPolicy.strictSourceFidelity ? 'strict' : talkingPolicy.productLockMode,
          },
        })
        return createAssetInputError(
          'product_change_not_allowed',
          'Esse card preserva exatamente o produto da imagem base. Para trocar produto, logo, texto, embalagem ou cor, gere uma nova imagem ou cena primeiro.',
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

  normalizedInputParams = normalizeStudioEngineInputParams({
    type,
    inputParams: normalizedInputParams,
  })

  const enginePolicy = resolveStudioAssetEnginePolicy({
    type,
    inputParams: normalizedInputParams,
  })

  normalizedInputParams = applyStudioEngineMetadata(normalizedInputParams, enginePolicy)

  if (!isDraft) {
    try {
      assertStudioAssetExecutionReady(enginePolicy)
    } catch (error) {
      if (error instanceof StudioEnginePolicyError) {
        console.warn('[studio] engine_policy_blocked', JSON.stringify({
          type,
          code: error.code,
          status: error.status,
          billingRoute: error.policy.billingRoute,
          parityStatus: error.policy.parityStatus,
          message: error.message,
        }))
        return NextResponse.json({
          error: 'google_primary_required',
          code: error.code,
          message: error.message,
          billing_route: error.policy.billingRoute,
          runtime_engine: error.policy.runtimeEngine,
          runtime_model: error.policy.runtimeModel,
        }, { status: error.status })
      }
      throw error
    }
  }

  const baseCost = CREDIT_COST[type] ?? 1
  let effectiveCost = baseCost
  let composePricingPreflight: undefined
  if (
    type === 'compose'
    && !isDraft
    && String(normalizedInputParams.compose_variant ?? 'fitting') === 'fitting'
  ) {
    const normalizedProductUrls = Array.isArray(normalizedInputParams.product_urls)
      ? normalizedInputParams.product_urls.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : []
    composePricingPreflight = undefined
    normalizedInputParams = {
      ...normalizedInputParams,
      pricing_strategy: 'white_studio_fixed',
      pricing_tier: 'scene_white_studio',
      fitting_strategy: 'scene_white_studio',
      fitting_engine: 'scene_white_studio',
      fitting_route: 'scene_white_studio',
      fitting_primary_route: 'scene_white_studio',
      provador_engine: 'scene_white_studio',
      sovereign_mode: 'strict',
      white_studio_lock: true,
      smart_prompt_policy: 'light_pose_only',
      reference_conflict_policy: 'merge_same_zone_when_possible',
      fitting_reference_mode: normalizedProductUrls.length > 1 ? 'separate-references' : 'single-look-photo',
      fitting_reference_mix_mode: normalizedProductUrls.length > 1 ? 'sovereign-complementary' : 'single-look-photo',
      editorial_finisher_eligible: false,
      preflight_accessory_detected_types: [],
      preflight_ignored_prop_types: [],
    }
    effectiveCost = baseCost
  }
  if (type === 'video') {
    effectiveCost = getVideoGenerationCost(normalizedInputParams?.quality)
  }
  if (type === 'talking_video') {
    const talkingVideoAudioSource = String(normalizedInputParams.talking_video_audio_source ?? 'none') as TalkingVideoAudioSource
    effectiveCost = calculateTalkingVideoCredits({
      quality: String(normalizedInputParams?.quality ?? '720p'),
      audioSource: talkingVideoAudioSource,
    })
  } else if (type !== 'video' && String(normalizedInputParams?.quality ?? '') === '1080p') {
    effectiveCost *= 2
  }
  const { data: profile } = await admin.from('users').select('credits, plan').eq('id', user.id).single()

  // Bloqueia vídeo/animação/lipsync para plano Explorador (free)
  const PAID_PLANS = ['subscription', 'package', 'starter', 'popular', 'pro', 'agency']
  const VIDEO_TYPES = ['video', 'talking_video', 'animate', 'lipsync']
  if (VIDEO_TYPES.includes(type) && !PAID_PLANS.includes(profile?.plan ?? '')) {
    return NextResponse.json({ error: 'Geração de vídeo disponível apenas nos planos pagos. Faça upgrade para continuar.' }, { status: 403 })
  }

  const totalChunks = allSpeechChunks.length > 1 ? allSpeechChunks.length : 1
  const totalCost = effectiveCost * totalChunks
  if (!isDraft && (!profile || profile.credits < totalCost)) {
    const label = totalChunks > 1 ? ` (${totalChunks} partes × ${effectiveCost} cr)` : ''
    return NextResponse.json({ error: `Saldo insuficiente. Necessário ${totalCost} cr${label}.` }, { status: 402 })
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
      resultUrl = await generateImageGoogle({
        prompt: String(normalizedInputParams.prompt ?? ''),
        style: String(normalizedInputParams.style ?? 'ugc'),
        aspect_ratio: String(normalizedInputParams.aspect_ratio ?? '1:1'),
        model_prompt: normalizedInputParams.model_prompt ? String(normalizedInputParams.model_prompt) : undefined,
        source_face_url: normalizedInputParams.source_face_url ? String(normalizedInputParams.source_face_url) : undefined,
        assetId: asset.id,
        userId: user.id,
      })
    } else if (type === 'model') {
      const { url, text } = await generateModelGoogle({
        gender: String(normalizedInputParams.gender ?? 'feminino'),
        age_range: String(normalizedInputParams.age_range ?? '20-30'),
        skin_tone: String(normalizedInputParams.skin_tone ?? 'media'),
        body_type: String(normalizedInputParams.body_type ?? 'normal'),
        style: String(normalizedInputParams.style ?? 'casual'),
        extra_details: normalizedInputParams.extra_details ? String(normalizedInputParams.extra_details) : undefined,
        assetId: asset.id,
        userId: user.id,
      })
      resultUrl = url
      extraData = { model_text: text }
    } else if (type === 'script') {
      const { url, text } = await generateScriptGoogle({
        product: String(normalizedInputParams.product ?? ''),
        audience: String(normalizedInputParams.audience ?? ''),
        format: String(normalizedInputParams.format ?? 'reels'),
        hook_style: String(normalizedInputParams.hook_style ?? 'problema'),
        assetId: asset.id,
        userId: user.id,
      })
      resultUrl = url
      extraData = { script_text: text }
    } else if (type === 'voice') {
      resultUrl = await generateVoiceGoogle({
        script: String(normalizedInputParams.script ?? ''),
        voice_id: String(normalizedInputParams.voice_id ?? 'EXAVITQu4vr4xnSDxMaL'),
        speed: Number(normalizedInputParams.speed ?? 1.0),
        assetId: asset.id,
        userId: user.id,
      })
    } else if (type === 'caption') {
      const { url } = await generateCaptionGoogle({
        audio_url: String(normalizedInputParams.audio_url ?? ''),
        assetId: asset.id,
        userId: user.id,
      })
      resultUrl = url
    } else if (type === 'upscale') {
      const upscaleSourceUrl = String(normalizedInputParams.source_url ?? input_params.source_url ?? '').trim()
      if (!upscaleSourceUrl) throw Object.assign(new Error('Conecte uma imagem ao card de Upscale antes de gerar.'), { studioRefundReason: 'upscale:missing_source_url' })
      const upscaleQualityRaw = String(normalizedInputParams.quality ?? input_params.quality ?? '4k').trim()
      const upscaleQuality: '4k' | '8k' = upscaleQualityRaw === '8k' ? '8k' : '4k'
      resultUrl = await generateUpscale({
        source_url: upscaleSourceUrl,
        scale: Number(normalizedInputParams.scale ?? input_params.scale ?? 4),
        quality: upscaleQuality,
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
      const assetAspectRatio = String(normalizedInputParams.aspect_ratio ?? '9:16')

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

      let sourceImageUrlForGeneration = sourceImageUrl
      const useNativeVideoSpeech = String(normalizedInputParams.video_prompt_mode ?? '') === 'native_speech_script'
      if (Boolean(normalizedInputParams.scene_change_requested) && !useNativeVideoSpeech) {
        const videoScenePrepassPrompt = deriveVideoScenePrepassPrompt(
          String(normalizedInputParams.motion_prompt_raw ?? normalizedInputParams.motion_prompt ?? ''),
        )
        const sceneResult = await generateSceneVertexOnly({
          source_url: sourceImageUrl,
          scene_prompt: videoScenePrepassPrompt,
          aspect_ratio: assetAspectRatio,
          assetId: asset.id,
          userId: user.id,
          mode: 'video',
          requested_scene_change: Boolean(normalizedInputParams.scene_change_requested),
          source_visible_item_manifest: Array.isArray(normalizedInputParams.source_visible_item_manifest)
            ? normalizedInputParams.source_visible_item_manifest.filter((value): value is string => typeof value === 'string')
            : [],
          require_exact_text_logo: Boolean(normalizedInputParams.source_text_logo_lock),
          require_exact_color: Boolean(normalizedInputParams.source_color_lock),
          strict_source_fidelity: String(normalizedInputParams.source_fidelity_mode ?? '') === 'strict',
          model_override: typeof normalizedInputParams.runtime_model === 'string' ? normalizedInputParams.runtime_model : undefined,
        })
        sourceImageUrlForGeneration = sceneResult.url
        normalizedInputParams = {
          ...normalizedInputParams,
          source_image_url: sourceImageUrlForGeneration,
          scene_change_blocked: false,
          video_scene_presolved: true,
          video_scene_prepass_asset_url: sourceImageUrlForGeneration,
          video_scene_prepass_engine: `scene:${sceneResult.modelUsed}`,
          video_scene_prepass_model: sceneResult.modelUsed,
          video_scene_prepass_prompt: videoScenePrepassPrompt,
          video_scene_prepass_prompt_strategy: 'derived_static_scene_v1',
          video_scene_prepass_strategy: sceneResult.strategyUsed,
          video_scene_prepass_skipped_reason: '',
        }
      } else if (Boolean(normalizedInputParams.scene_change_requested) && useNativeVideoSpeech) {
        normalizedInputParams = {
          ...normalizedInputParams,
          video_scene_presolved: false,
          video_scene_prepass_asset_url: '',
          video_scene_prepass_engine: '',
          video_scene_prepass_model: '',
          video_scene_prepass_prompt: '',
          video_scene_prepass_prompt_strategy: '',
          video_scene_prepass_strategy: '',
          video_scene_prepass_skipped_reason: 'native_speech_script_preserves_dialogue',
        }
      }

      if (normalizedInputParams.engine === 'veo') {
        await startVeo3DirectGoogle({
          source_image_url: sourceImageUrlForGeneration,
          motion_prompt:    String(normalizedInputParams.motion_prompt_normalized ?? normalizedInputParams.motion_prompt ?? ''),
          model_prompt: normalizedInputParams.model_prompt ? String(normalizedInputParams.model_prompt) : undefined,
          motion_prompt_raw: String(normalizedInputParams.motion_prompt_raw ?? normalizedInputParams.motion_prompt ?? ''),
          motion_prompt_normalized: String(normalizedInputParams.motion_prompt_normalized ?? normalizedInputParams.motion_prompt ?? ''),
          aspect_ratio: assetAspectRatio,
          removed_directives: Array.isArray(normalizedInputParams.removed_directives)
            ? normalizedInputParams.removed_directives.filter((value): value is string => typeof value === 'string')
            : [],
          video_lock_policy: String(normalizedInputParams.video_lock_policy ?? ''),
          scene_change_requested: Boolean(normalizedInputParams.scene_change_requested),
          scene_change_blocked: Boolean(normalizedInputParams.scene_change_blocked),
          duration:         Number(input_params.duration ?? 5),
          quality:          normalizeStudioVideoQuality(normalizedInputParams.quality ?? input_params.quality),
          assetId:          asset.id,
          userId:           user.id,
          strict_source_fidelity: String(normalizedInputParams.source_fidelity_mode ?? '') === 'strict',
          source_visible_item_manifest: Array.isArray(normalizedInputParams.source_visible_item_manifest)
            ? normalizedInputParams.source_visible_item_manifest.filter((value): value is string => typeof value === 'string')
            : [],
          source_text_logo_lock: Boolean(normalizedInputParams.source_text_logo_lock),
          source_color_lock: Boolean(normalizedInputParams.source_color_lock),
          generate_audio: false,
          scene_livre: Boolean(normalizedInputParams.scene_livre),
          guideline_block_handling: 'video',
          inputParamsPatch: {
            video_scene_presolved: Boolean(normalizedInputParams.video_scene_presolved),
            video_scene_prepass_asset_url: String(normalizedInputParams.video_scene_prepass_asset_url ?? ''),
            video_scene_prepass_engine: String(normalizedInputParams.video_scene_prepass_engine ?? ''),
            video_scene_prepass_prompt: String(normalizedInputParams.video_scene_prepass_prompt ?? ''),
            video_scene_prepass_prompt_strategy: String(normalizedInputParams.video_scene_prepass_prompt_strategy ?? ''),
            video_scene_prepass_model: String(normalizedInputParams.video_scene_prepass_model ?? ''),
            video_scene_prepass_strategy: String(normalizedInputParams.video_scene_prepass_strategy ?? ''),
            video_scene_prepass_skipped_reason: String(normalizedInputParams.video_scene_prepass_skipped_reason ?? ''),
            video_prompt_mode: String(normalizedInputParams.video_prompt_mode ?? ''),
            video_audio_mode: String(normalizedInputParams.video_audio_mode ?? ''),
            video_dialogue_language: String(normalizedInputParams.video_dialogue_language ?? ''),
            video_dialogue_line: String(normalizedInputParams.video_dialogue_line ?? ''),
          },
        })
      } else if (normalizedInputParams.engine === 'grok') {
        await startGrokVideoGeneration({
          source_image_url: sourceImageUrlForGeneration,
          motion_prompt: String(normalizedInputParams.motion_prompt_normalized ?? normalizedInputParams.motion_prompt ?? ''),
          motion_prompt_raw: String(normalizedInputParams.motion_prompt_raw ?? normalizedInputParams.motion_prompt ?? ''),
          motion_prompt_normalized: String(normalizedInputParams.motion_prompt_normalized ?? normalizedInputParams.motion_prompt ?? ''),
          duration: Number(input_params.duration ?? 8),
          aspect_ratio: assetAspectRatio,
          assetId: asset.id,
          userId: user.id,
          inputParamsPatch: {
            video_scene_presolved: Boolean(normalizedInputParams.video_scene_presolved),
            video_scene_prepass_asset_url: String(normalizedInputParams.video_scene_prepass_asset_url ?? ''),
            video_scene_prepass_engine: String(normalizedInputParams.video_scene_prepass_engine ?? ''),
          },
        })
      } else {
        await startVideoGeneration({
          source_image_url: sourceImageUrlForGeneration,
          motion_prompt: String(normalizedInputParams.motion_prompt_normalized ?? normalizedInputParams.motion_prompt ?? ''),
          duration: Number(input_params.duration ?? 5),
          aspect_ratio: assetAspectRatio,
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
          strict_source_fidelity: String(normalizedInputParams.source_fidelity_mode ?? '') === 'strict',
          source_visible_item_manifest: Array.isArray(normalizedInputParams.source_visible_item_manifest)
            ? normalizedInputParams.source_visible_item_manifest.filter((value): value is string => typeof value === 'string')
            : [],
          source_text_logo_lock: Boolean(normalizedInputParams.source_text_logo_lock),
          source_color_lock: Boolean(normalizedInputParams.source_color_lock),
          inputParamsPatch: {
            video_scene_presolved: Boolean(normalizedInputParams.video_scene_presolved),
            video_scene_prepass_asset_url: String(normalizedInputParams.video_scene_prepass_asset_url ?? ''),
            video_scene_prepass_engine: String(normalizedInputParams.video_scene_prepass_engine ?? ''),
          },
        })
      }
      return NextResponse.json({ asset: { ...responseAsset, status: 'processing' } }, { status: 201 })

    } else if (type === 'talking_video') {
      const talkingMode = String(normalizedInputParams.talking_video_mode ?? 'exact_speech') === 'veo_natural'
        ? 'veo_natural'
        : 'exact_speech'
      const sourceImageUrl = String(normalizedInputParams.source_image_url ?? '')
      const externalAudioUrl = String(normalizedInputParams.audio_url ?? '').trim()
      const hasExternalAudio = externalAudioUrl.length > 0
      const quality = String(normalizedInputParams.quality ?? '720p')
      const assetAspectRatio = String(normalizedInputParams.aspect_ratio ?? '9:16')
      const appUrl = resolveAppUrl(req)
      let promptOverride = String(normalizedInputParams.talking_video_prompt_final ?? '')
      let pipelineAttempts = asRecord(normalizedInputParams.pipeline_attempts)
      let sourceImageUrlForGeneration = sourceImageUrl

      if (
        Boolean(normalizedInputParams.talking_video_scene_presolve_required)
        && !Boolean(normalizedInputParams.talking_video_scene_presolved)
      ) {
        const sceneResult = await generateSceneVertexOnly({
          source_url: sourceImageUrl,
          scene_prompt: String(
            normalizedInputParams.visual_prompt_raw
              ?? normalizedInputParams.visual_prompt
              ?? normalizedInputParams.idea_prompt_raw
              ?? normalizedInputParams.idea_prompt
              ?? '',
          ),
          aspect_ratio: assetAspectRatio,
          assetId: asset.id,
          userId,
          mode: 'talking_video',
          requested_scene_change: Boolean(normalizedInputParams.requested_scene_change),
          requested_wardrobe_change: Boolean(normalizedInputParams.requested_wardrobe_change),
          source_visible_item_manifest: Array.isArray(normalizedInputParams.source_visible_item_manifest)
            ? normalizedInputParams.source_visible_item_manifest.filter((value): value is string => typeof value === 'string')
            : [],
          require_exact_text_logo: Boolean(normalizedInputParams.source_text_logo_lock),
          require_exact_color: Boolean(normalizedInputParams.source_color_lock),
          strict_source_fidelity: String(normalizedInputParams.source_fidelity_mode ?? '') === 'strict',
          model_override: typeof normalizedInputParams.runtime_model === 'string' ? normalizedInputParams.runtime_model : undefined,
        })
        sourceImageUrlForGeneration = sceneResult.url

        const refreshedTalkingPolicy = prepareTalkingVideoPrompt({
          mode: talkingMode,
          ideaPrompt: String(normalizedInputParams.idea_prompt_raw ?? normalizedInputParams.idea_prompt ?? ''),
          speechText: String(normalizedInputParams.speech_text_input_raw ?? normalizedInputParams.speech_text_raw ?? normalizedInputParams.speech_text ?? ''),
          expressionDirection: String(normalizedInputParams.expression_direction_input_raw ?? normalizedInputParams.expression_direction ?? ''),
          visualPrompt: String(normalizedInputParams.visual_prompt_input_raw ?? normalizedInputParams.visual_prompt_raw ?? normalizedInputParams.visual_prompt ?? ''),
          requestedSceneChange: Boolean(normalizedInputParams.requested_scene_change),
          requestedWardrobeChange: Boolean(normalizedInputParams.requested_wardrobe_change),
          sourceAsset: {
            type: 'scene',
            input_params: {
              force_strict_source_fidelity: String(normalizedInputParams.source_fidelity_mode ?? '') === 'strict',
              preserve_all_visible_source_items: Boolean(normalizedInputParams.preserve_all_visible_source_items),
              source_visible_item_manifest: Array.isArray(normalizedInputParams.source_visible_item_manifest)
                ? normalizedInputParams.source_visible_item_manifest.filter((value): value is string => typeof value === 'string')
                : [],
              source_text_logo_lock: Boolean(normalizedInputParams.source_text_logo_lock),
              source_color_lock: Boolean(normalizedInputParams.source_color_lock),
            },
          },
        })

        promptOverride = refreshedTalkingPolicy.finalPrompt
        normalizedInputParams = {
          ...normalizedInputParams,
          source_image_url: sourceImageUrlForGeneration,
          talking_video_original_source_image_url: sourceImageUrl,
          talking_video_scene_presolved: true,
          talking_video_scene_prepass_asset_url: sourceImageUrlForGeneration,
          talking_video_scene_prepass_engine: `scene:${sceneResult.modelUsed}`,
          talking_video_scene_prepass_model: sceneResult.modelUsed,
          talking_video_scene_prepass_strategy: sceneResult.strategyUsed,
          talking_video_prompt_final: promptOverride,
        }

        await admin.from('studio_assets').update({
          input_params: normalizedInputParams,
        }).eq('id', asset.id)
      }

      if (talkingMode === 'exact_speech') {
        // Gerar TTS Grok automaticamente se não houver áudio externo conectado
        let autoGeneratedVoiceUrl = String(normalizedInputParams.generated_voice_url ?? '')
        if (!hasExternalAudio && !autoGeneratedVoiceUrl) {
          const speechForTts = String(normalizedInputParams.speech_text_chunk ?? normalizedInputParams.speech_text_normalized ?? normalizedInputParams.speech_text_raw ?? '').trim()
          if (!speechForTts) throw Object.assign(
            new Error('Preencha o texto de fala exata antes de gerar o vídeo.'),
            { studioRefundReason: 'talking_video:missing_speech_text' },
          )
          const rawVoiceId = String(normalizedInputParams.voice_id ?? '').trim()
          // ElevenLabs IDs são 15+ chars alfanuméricos mistos — inválidos no Grok TTS
          const voiceId = /^[A-Za-z0-9]{15,}$/.test(rawVoiceId) ? 'ara' : (rawVoiceId || 'ara')
          try {
            autoGeneratedVoiceUrl = await generateVoiceGrok({
              script: speechForTts,
              voice_id: voiceId,
              assetId: asset.id,
              userId,
            })
          } catch (ttsErr: unknown) {
            const ttsMsg = ttsErr instanceof Error ? ttsErr.message : String(ttsErr)
            console.error('[talking_video] Grok TTS falhou:', ttsMsg)
            throw Object.assign(
              new Error(`Falha ao gerar áudio (Grok TTS): ${ttsMsg}`),
              { studioRefundReason: 'talking_video:tts_failed' },
            )
          }
          normalizedInputParams = { ...normalizedInputParams, generated_voice_url: autoGeneratedVoiceUrl }
          await admin.from('studio_assets').update({ input_params: normalizedInputParams }).eq('id', asset.id)
        }

        pipelineAttempts = incrementTalkingPipelineAttempts(pipelineAttempts, 'veo_generating')
        const hasAutoVoice = Boolean(autoGeneratedVoiceUrl)
        await startTalkingVideoMotionGeneration({
          source_image_url: sourceImageUrlForGeneration,
          motion_prompt: String(normalizedInputParams.visual_prompt_normalized ?? normalizedInputParams.visual_prompt ?? ''),
          aspect_ratio: assetAspectRatio,
          prompt_override: promptOverride,
          generate_audio: false,
          duration: 8,
          quality,
          assetId: asset.id,
          userId,
          appUrl,
          strict_source_fidelity: String(normalizedInputParams.source_fidelity_mode ?? '') === 'strict',
          source_visible_item_manifest: Array.isArray(normalizedInputParams.source_visible_item_manifest)
            ? normalizedInputParams.source_visible_item_manifest.filter((value): value is string => typeof value === 'string')
            : [],
          source_text_logo_lock: Boolean(normalizedInputParams.source_text_logo_lock),
          source_color_lock: Boolean(normalizedInputParams.source_color_lock),
          inputParamsPatch: {
            pipeline_stage: 'veo_generating',
            pipeline_attempts: pipelineAttempts,
            generated_voice_asset_id: '',
            generated_voice_url: autoGeneratedVoiceUrl,
            actual_speech_seconds: null,
            talking_video_has_external_audio: hasExternalAudio,
            talking_video_audio_source: hasExternalAudio ? 'connected_audio' : (hasAutoVoice ? 'generated_tts' : 'none'),
            talking_video_delivery_mode: (hasExternalAudio || hasAutoVoice) ? 'external_audio_lipsync' : 'silent_veo_only',
            audio_generation_requested: false,
          },
        })
      } else {
        pipelineAttempts = incrementTalkingPipelineAttempts(pipelineAttempts, 'veo_generating')
        const useNativeVeoAudio = !hasExternalAudio
        await startTalkingVideoMotionGeneration({
          source_image_url: sourceImageUrlForGeneration,
          motion_prompt: String(normalizedInputParams.visual_prompt_normalized ?? normalizedInputParams.visual_prompt ?? ''),
          aspect_ratio: assetAspectRatio,
          prompt_override: promptOverride,
          generate_audio: useNativeVeoAudio,
          duration: 8,
          quality,
          assetId: asset.id,
          userId,
          appUrl,
          strict_source_fidelity: String(normalizedInputParams.source_fidelity_mode ?? '') === 'strict',
          source_visible_item_manifest: Array.isArray(normalizedInputParams.source_visible_item_manifest)
            ? normalizedInputParams.source_visible_item_manifest.filter((value): value is string => typeof value === 'string')
            : [],
          source_text_logo_lock: Boolean(normalizedInputParams.source_text_logo_lock),
          source_color_lock: Boolean(normalizedInputParams.source_color_lock),
          inputParamsPatch: {
            pipeline_stage: 'veo_generating',
            pipeline_attempts: pipelineAttempts,
            generated_voice_asset_id: '',
            generated_voice_url: '',
            actual_speech_seconds: null,
            talking_video_has_external_audio: hasExternalAudio,
            talking_video_audio_source: hasExternalAudio ? 'connected_audio' : 'veo_native',
            talking_video_delivery_mode: hasExternalAudio ? 'external_audio_lipsync' : 'native_veo_audio',
            audio_generation_requested: useNativeVeoAudio,
          },
        })
      }

      // Auto-chain: criar assets filhos para chunks restantes
      if (allSpeechChunks.length > 1) {
        const chainId = crypto.randomUUID()
        const siblingIds = allSpeechChunks.slice(1).map(() => crypto.randomUUID())

        // Re-ler input_params do DB para capturar prediction_id salvo por startTalkingVideoMotionGeneration
        const { data: freshAssetForChain } = await admin.from('studio_assets')
          .select('input_params')
          .eq('id', asset.id)
          .single()
        const freshParamsForChain = (freshAssetForChain?.input_params as Record<string, unknown> | null) ?? normalizedInputParams

        // Atualizar asset 0 com metadados da cadeia (preservando prediction_id)
        await admin.from('studio_assets').update({
          input_params: {
            ...freshParamsForChain,
            chain_id: chainId,
            chain_index: 0,
            chain_total: allSpeechChunks.length,
            chain_next_asset_id: siblingIds[0],
          },
        }).eq('id', asset.id)

        // Cobrar créditos dos chunks restantes de uma vez
        const remainingChunkCost = effectiveCost * (allSpeechChunks.length - 1)
        await admin.rpc('debit_credits_bulk', { user_id_param: user.id, amount_param: remainingChunkCost })

        // Criar assets idle para chunks 1..N-1
        for (let ci = 1; ci < allSpeechChunks.length; ci++) {
          const chunk = allSpeechChunks[ci]
          const siblingId = siblingIds[ci - 1]
          const nextSiblingId = ci < allSpeechChunks.length - 1 ? siblingIds[ci] : null
          const remainingAfter = allSpeechChunks.slice(ci + 1)
          const siblingParams: Record<string, unknown> = {
            ...normalizedInputParams,
            // Limpar prediction_id para que cada sibling tenha o seu próprio
            prediction_id: undefined,
            is_chain_child: true,
            speech_text_chunk: chunk.text,
            speech_text_chunk_normalized: chunk.text,
            speech_text_remaining: remainingAfter.map(c => c.text).join(' '),
            speech_text_remaining_normalized: remainingAfter.map(c => c.text).join(' '),
            estimated_chunk_seconds: chunk.seconds,
            estimated_remaining_speech_seconds: remainingAfter.reduce((acc, c) => acc + c.seconds, 0),
            generated_voice_url: '',
            generated_voice_asset_id: '',
            source_image_url: '',
            pipeline_stage: 'chain_waiting',
            talking_video_chunked: remainingAfter.length > 0,
            continuation_available: remainingAfter.length > 0,
            continuation_idea_prompt: '',
            chain_id: chainId,
            chain_index: ci,
            chain_total: allSpeechChunks.length,
            chain_next_asset_id: nextSiblingId ?? '',
            chain_prev_asset_id: ci === 1 ? asset.id : siblingIds[ci - 2],
          }
          await admin.from('studio_assets').insert({
            id: siblingId,
            project_id,
            user_id: user.id,
            type: persistedType,
            status: 'idle',
            input_params: siblingParams,
            credits_cost: effectiveCost,
            board_order: asset.board_order,
            position_x: ((asset as unknown as Record<string, unknown>).position_x as number ?? 0) + ci * 380,
            position_y: (asset as unknown as Record<string, unknown>).position_y as number ?? 0,
          })
        }
      }

      return NextResponse.json({ asset: { ...responseAsset, status: 'processing' } }, { status: 201 })

    } else if (type === 'animate') {
      const appUrl = resolveAppUrl(req)

      await startAnimateGeneration({
        portrait_image_url: String(normalizedInputParams.portrait_image_url ?? input_params.portrait_image_url ?? ''),
        driving_video_url: String(normalizedInputParams.driving_video_url ?? input_params.driving_video_url ?? ''),
        motion_prompt: normalizedInputParams.motion_prompt
          ? String(normalizedInputParams.motion_prompt)
          : 'Use o video de referencia para guiar gesto, energia e camera, preservando a identidade da personagem base.',
        assetId: asset.id,
        userId: user.id,
        appUrl,
      })
      return NextResponse.json({ asset: { ...responseAsset, status: 'processing' } }, { status: 201 })

    } else if (type === 'lipsync') {
      const lipsyncFaceUrl  = String(normalizedInputParams.face_url  ?? input_params.face_url  ?? '').trim()
      const lipsyncAudioUrl = String(normalizedInputParams.audio_url ?? input_params.audio_url ?? '').trim()
      if (!lipsyncFaceUrl)  throw Object.assign(new Error('Conecte um vídeo ou imagem ao campo Rosto antes de gerar o Lipsync.'),  { studioRefundReason: 'lipsync:missing_face_url'  })
      if (!lipsyncAudioUrl) throw Object.assign(new Error('Conecte um áudio ao campo Áudio antes de gerar o Lipsync.'), { studioRefundReason: 'lipsync:missing_audio_url' })
      const appUrl = resolveAppUrl(req)

      await startLipsyncGeneration({
        face_url:  lipsyncFaceUrl,
        audio_url: lipsyncAudioUrl,
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
      resultUrl = await generateMusicGoogle({
        prompt: String(normalizedInputParams.prompt ?? ''),
        source_image_url: normalizedInputParams.source_image_url ? String(normalizedInputParams.source_image_url) : undefined,
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
      const extraUrls = Array.isArray(normalizedInputParams.extra_source_urls)
        ? normalizedInputParams.extra_source_urls.filter((value): value is string => typeof value === 'string' && value.startsWith('http'))
        : []
      const sceneResult = await generateSceneVertexOnly({
        source_url: String(normalizedInputParams.source_url ?? ''),
        extra_source_urls: extraUrls,
        scene_prompt: String(normalizedInputParams.scene_prompt ?? ''),
        aspect_ratio: String(normalizedInputParams.aspect_ratio ?? '9:16'),
        assetId: asset.id,
        userId: user.id,
        requested_scene_change: Boolean(normalizedInputParams.requested_scene_change),
        requested_wardrobe_change: Boolean(normalizedInputParams.requested_wardrobe_change),
        requested_body_reframe: Boolean(normalizedInputParams.requested_body_reframe),
        source_visible_item_manifest: Array.isArray(normalizedInputParams.source_visible_item_manifest)
          ? normalizedInputParams.source_visible_item_manifest.filter((value): value is string => typeof value === 'string')
          : [],
        require_exact_text_logo: Boolean(normalizedInputParams.source_text_logo_lock),
        require_exact_color: Boolean(normalizedInputParams.source_color_lock),
        strict_source_fidelity: String(normalizedInputParams.source_fidelity_mode ?? '') === 'strict',
        model_override: typeof normalizedInputParams.runtime_model === 'string' ? normalizedInputParams.runtime_model : undefined,
      })
      resultUrl = sceneResult.url
      extraData = {
        ...extraData,
        scene_generation_model: sceneResult.modelUsed,
        scene_generation_strategy: sceneResult.strategyUsed,
      }
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
      resultUrl = await joinVideosRobust({ video_urls: videoUrls, assetId: asset.id, userId: user.id })
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
