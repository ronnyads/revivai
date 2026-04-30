export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CREDIT_COST, generateImage, generateScript, generateVoice, generateCaption, generateUpscale, startVideoGeneration, startVeo3DirectGoogle, generateModel, mergeVideoAudio, startAnimateGeneration, composeProductScene, startLipsyncGeneration, joinVideos, generateAngles, generateMusic, generateUGCPositions, generateScene, splitLookReferences } from '@/lib/studio'
import { markStudioAssetFailed } from '@/lib/studioAssetFailure'
import { AssetType } from '@/types'
import { checkRateLimit } from '@/lib/rateLimit'

type StudioAssetRecord = {
  id: string
  [key: string]: unknown
}

type ExistingAssetOwnership = {
  id: string
  project_id: string
  user_id: string
  type: AssetType
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
      .select('id, project_id, user_id, type')
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
      if (ownedAsset.type !== type) {
        return NextResponse.json({ error: 'Tipo do asset nÃ£o pode ser alterado' }, { status: 409 })
      }
    } else if (existing_id) {
      return NextResponse.json({ error: 'Asset para regenerar nÃ£o encontrado' }, { status: 404 })
    }
  }

  if (!project_id || !type) return NextResponse.json({ error: 'project_id e type obrigatórios' }, { status: 400 })

  let normalizedInputParams: Record<string, unknown> = { ...(input_params ?? {}) }
  if (type === 'compose') {
    const composeVariant = String(normalizedInputParams.compose_variant ?? 'fitting')
    const composeMode = String(normalizedInputParams.compose_mode ?? 'try-on')
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
      ...normalizedInputParams,
      compose_variant: composeVariant,
      compose_mode: composeMode,
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

  const baseCost = CREDIT_COST[type] ?? 1
  let effectiveCost = baseCost
  if (type === 'video' && String(normalizedInputParams?.engine ?? '') === 'veo') {
    effectiveCost = CREDIT_COST['video_veo'] ?? 50
  }
  // Dobra o custo se a qualidade for 1080p HQ
  if (String(normalizedInputParams?.quality ?? '') === '1080p') {
    effectiveCost *= 2
  }
  const { data: profile } = await admin.from('users').select('credits, plan').eq('id', user.id).single()

  // Bloqueia vídeo/animação/lipsync para plano Explorador (free)
  const PAID_PLANS = ['subscription', 'package', 'starter', 'popular', 'pro', 'agency']
  const VIDEO_TYPES = ['video', 'animate', 'lipsync']
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
    type, 
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

  await admin
    .from('studio_projects')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', project_id)
    .eq('user_id', user.id)

  // Se for rascunho, para aqui
  if (isDraft) return NextResponse.json({ asset }, { status: 201 })

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
          source_image_url: String(input_params.source_image_url ?? ''),
          motion_prompt:    String(input_params.motion_prompt ?? ''),
          duration:         Number(input_params.duration ?? 5),
          quality:          String(input_params.quality ?? '720p'),
          assetId:          asset.id,
          userId:           user.id,
        })
      } else {
        await startVideoGeneration({
          source_image_url: sourceImageUrl,
          motion_prompt: String(input_params.motion_prompt ?? ''),
          duration: Number(input_params.duration ?? 5),
          model_prompt: input_params.model_prompt ? String(input_params.model_prompt) : undefined,
          assetId: asset.id,
          userId: user.id,
          appUrl,
        })
      }
      return NextResponse.json({ asset: { ...asset, status: 'processing' } }, { status: 201 })

    } else if (type === 'animate') {
      const origin    = req.headers.get('origin') ?? req.headers.get('x-forwarded-host')
      const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
      const appUrl    = origin
        ? (origin.startsWith('http') ? origin : `https://${origin}`)
        : (process.env.NEXT_PUBLIC_APP_URL ?? vercelUrl ?? 'http://localhost:3000')
      await startAnimateGeneration({
        portrait_image_url: String(input_params.portrait_image_url ?? ''),
        driving_video_url:  String(input_params.driving_video_url  ?? ''),
        motion_prompt: input_params.motion_prompt ? String(input_params.motion_prompt) : undefined,
        assetId: asset.id,
        userId: user.id,
        appUrl,
      })
      return NextResponse.json({ asset: { ...asset, status: 'processing' } }, { status: 201 })

    } else if (type === 'lipsync') {
      const origin    = req.headers.get('origin') ?? req.headers.get('x-forwarded-host')
      const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
      const appUrl    = origin
        ? (origin.startsWith('http') ? origin : `https://${origin}`)
        : (process.env.NEXT_PUBLIC_APP_URL ?? vercelUrl ?? 'http://localhost:3000')

      await startLipsyncGeneration({
        face_url:  String(input_params.face_url  ?? ''),
        audio_url: String(input_params.audio_url ?? ''),
        assetId: asset.id,
        userId:  user.id,
        appUrl,
      })
      return NextResponse.json({ asset: { ...asset, status: 'processing' } }, { status: 201 })

    } else if (type === 'compose') {
      const composeVariant = String(normalizedInputParams.compose_variant ?? 'fitting')
      const composeMode = String(normalizedInputParams.compose_mode ?? 'try-on')
      const composeResult = await composeProductScene({
        portrait_url:  String(normalizedInputParams.portrait_url   ?? ''),
        product_url:   String(normalizedInputParams.product_url    ?? ''),
        product_urls:  Array.isArray(normalizedInputParams.product_urls)
          ? normalizedInputParams.product_urls.filter((value): value is string => typeof value === 'string')
          : undefined,
        compose_mode:  composeVariant === 'fitting' ? 'vertex-vto' : composeMode,
        compose_variant: composeVariant,
        position:      normalizedInputParams.position ? String(normalizedInputParams.position) : 'southeast',
        product_scale: normalizedInputParams.product_scale ? Number(normalizedInputParams.product_scale) : 0.35,
        aspect_ratio: normalizedInputParams.aspect_ratio ? String(normalizedInputParams.aspect_ratio) : '9:16',
        vton_category: normalizedInputParams.vton_category ? String(normalizedInputParams.vton_category) : undefined,
        fitting_category: normalizedInputParams.fitting_category ? String(normalizedInputParams.fitting_category) : undefined,
        fitting_pose_preset: normalizedInputParams.fitting_pose_preset ? String(normalizedInputParams.fitting_pose_preset) : undefined,
        fitting_energy_preset: normalizedInputParams.fitting_energy_preset ? String(normalizedInputParams.fitting_energy_preset) : undefined,
        costume_prompt: normalizedInputParams.costume_prompt ? String(normalizedInputParams.costume_prompt) : undefined,
        smart_prompt:  normalizedInputParams.smart_prompt ? String(normalizedInputParams.smart_prompt) : undefined,
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
        ...asset,
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
    
    console.error(`[studio] CRITICAL ERROR [Asset ${asset?.id}]:`, {
      message: errorMsg,
      stack: errorStack,
      type,
      input_params: normalizedInputParams
    })

    if (asset?.id) {
      await markStudioAssetFailed({
        admin,
        assetId: asset.id,
        errorMsg,
        refundReason: failureMetadata.studioRefundReason ?? `sync-post:${type}`,
        extraInputParams: failureMetadata.studioFailureData,
      })
    }
    
    return NextResponse.json({ 
      error: errorMsg,
      code: 'INTERNAL_SERVER_ERROR',
      asset_id: asset?.id 
    }, { status: 500 })
  }
}
