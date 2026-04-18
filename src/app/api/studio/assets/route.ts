export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CREDIT_COST, generateImage, generateScript, generateVoice, generateCaption, generateUpscale, startVideoGeneration, startVeo3DirectGoogle, generateModel, mergeVideoAudio, startAnimateGeneration, composeProductScene, startLipsyncGeneration, joinVideos, generateAngles, generateMusic } from '@/lib/studio'
import { AssetType } from '@/types'
import { checkRateLimit } from '@/lib/rateLimit'

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

  if (!project_id || !type) return NextResponse.json({ error: 'project_id e type obrigatórios' }, { status: 400 })

  // 1. Cálculo de Custo e Verificação de Saldo
  const baseCost = CREDIT_COST[type] ?? 1
  let effectiveCost = baseCost
  if (type === 'video' && String(input_params?.engine ?? '') === 'veo') {
    effectiveCost = CREDIT_COST['video_veo'] ?? 50
  }

  const isDraft = body.status === 'idle'
  const { data: profile } = await supabase.from('users').select('credits').eq('id', user.id).single()
  
  if (!isDraft && (!profile || profile.credits < effectiveCost)) {
    return NextResponse.json({ error: `Saldo insuficiente. Necessário ${effectiveCost} cr.` }, { status: 402 })
  }

  const admin = createAdminClient()

  // 2. Registro do Asset (Smart Upsert)
  let asset: any
  const status = isDraft ? 'idle' : 'processing'
  const insertData: any = { 
    project_id, 
    user_id: user.id, 
    type, 
    status, 
    input_params, 
    credits_cost: isDraft ? 0 : effectiveCost,
    board_order: 0
  }
  if (frontend_id || existing_id) insertData.id = frontend_id || existing_id

  const { data: inserted, error: dbErr } = await admin
    .from('studio_assets')
    .upsert(insertData, { onConflict: 'id' })
    .select()
    .single()
  
  if (dbErr || !inserted) {
    return NextResponse.json({ error: dbErr?.message ?? 'Erro ao criar registro' }, { status: 500 })
  }
  asset = inserted

  // Se for rascunho, para aqui
  if (isDraft) return NextResponse.json({ asset }, { status: 201 })

  // 3. COBRANÇA IMEDIATA (Atomic Debit)
  // Debita antes de gastar com as APIs externas de IA.
  try {
    await admin.rpc('debit_credits_bulk', { 
      user_id_param: user.id, 
      amount_param: effectiveCost 
    })
  } catch (chargeErr: any) {
    console.error(`[studio] Falha na cobrança:`, chargeErr.message)
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
      })
    } else if (type === 'video') {
      const origin    = req.headers.get('origin') ?? req.headers.get('x-forwarded-host')
      const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
      const appUrl    = origin
        ? (origin.startsWith('http') ? origin : `https://${origin}`)
        : (process.env.NEXT_PUBLIC_APP_URL ?? vercelUrl ?? 'http://localhost:3000')

      const AUDIO_EXTS = /\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i
      const continuationFrame = String(input_params.continuation_frame ?? '')
      const sourceImageUrl = (continuationFrame && !AUDIO_EXTS.test(continuationFrame))
        ? continuationFrame
        : String(input_params.source_image_url ?? '')

      if (input_params.engine === 'veo') {
        await startVeo3DirectGoogle({
          source_image_url: sourceImageUrl,
          motion_prompt: String(input_params.motion_prompt ?? ''),
          assetId: asset.id,
          userId: user.id,
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
      resultUrl = await composeProductScene({
        portrait_url:  String(input_params.portrait_url   ?? ''),
        product_url:   String(input_params.product_url    ?? ''),
        compose_mode:  String(input_params.compose_mode   ?? 'try-on'),
        position:      (input_params.position as any)     ?? 'southeast',
        product_scale: input_params.product_scale ? Number(input_params.product_scale) : 0.35,
        vton_category: String(input_params.vton_category  ?? 'tops'),
        costume_prompt: input_params.costume_prompt ? String(input_params.costume_prompt) : undefined,
        assetId: asset.id,
        userId:  user.id,
      })
    } else if (type === 'music') {
      resultUrl = await generateMusic({
        prompt: String(input_params.prompt ?? ''),
        source_image_url: input_params.source_image_url ? String(input_params.source_image_url) : undefined,
        assetId: asset.id,
        userId: user.id
      })
    } else if (type === 'angles') {
      resultUrl = await generateAngles({
        source_url: String(input_params.source_url ?? ''),
        angle: String(input_params.angle ?? 'frontal'),
        engine: String(input_params.engine ?? 'flux'),
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
      input_params: { ...input_params, ...extraData },
    }).eq('id', asset.id)

    return NextResponse.json({
      asset: {
        ...asset,
        status: 'done',
        result_url: resultUrl,
        input_params: { ...input_params, ...extraData },
      }
    }, { status: 201 })

  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    const errorStack = err instanceof Error ? err.stack : ''
    
    console.error(`[studio] CRITICAL ERROR [Asset ${asset?.id}]:`, {
      message: errorMsg,
      stack: errorStack,
      type,
      input_params
    })

    if (asset?.id) {
      await admin.from('studio_assets').update({ 
        status: 'error', 
        error_msg: errorMsg.slice(0, 500) 
      }).eq('id', asset.id)
    }
    
    return NextResponse.json({ 
      error: errorMsg,
      code: 'INTERNAL_SERVER_ERROR',
      asset_id: asset?.id 
    }, { status: 500 })
  }
}
