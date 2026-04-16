export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CREDIT_COST, generateImage, generateScript, generateVoice, generateCaption, generateUpscale, startVideoGeneration, generateModel, mergeVideoAudio, startAnimateGeneration, composeProductScene, startLipsyncGeneration } from '@/lib/studio'
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

  // ── Rate limit: max 10 assets/minute por usuário ──
  if (!checkRateLimit(user.id, 'studio-asset', { max: 10, windowMs: 60_000 })) {
    return NextResponse.json(
      { error: 'Muitos assets gerados. Aguarde um momento.' },
      { status: 429 }
    )
  }

  const body = await req.json()
  const { project_id, type, input_params, existing_id } = body as {
    project_id: string
    type: AssetType
    input_params: Record<string, unknown>
    existing_id?: string
  }

  if (!project_id || !type) return NextResponse.json({ error: 'project_id e type obrigatórios' }, { status: 400 })

  // Verifica ownership do projeto
  const { data: project } = await supabase
    .from('studio_projects')
    .select('id')
    .eq('id', project_id)
    .eq('user_id', user.id)
    .single()
  if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  // Verifica créditos
  const cost = CREDIT_COST[type] ?? 1
  const { data: profile } = await supabase.from('users').select('credits').eq('id', user.id).single()
  if (!profile || profile.credits < cost) {
    return NextResponse.json({ error: 'Sem créditos suficientes.' }, { status: 402 })
  }

  const admin = createAdminClient()

  // Reutiliza existing_id se fornecido (mantém o ID estável → conexões no canvas preservadas)
  // Caso contrário, cria novo registro
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let asset: any
  if (existing_id) {
    const { data: updated, error: updateErr } = await admin
      .from('studio_assets')
      .update({ type, status: 'processing', input_params, credits_cost: cost, result_url: null, error_msg: null })
      .eq('id', existing_id)
      .eq('user_id', user.id)
      .select()
      .single()
    if (updateErr || !updated) return NextResponse.json({ error: updateErr?.message ?? 'Erro ao atualizar asset' }, { status: 500 })
    asset = updated
  } else {
    const { count } = await supabase
      .from('studio_assets')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', project_id)
    const board_order = (count ?? 0)
    const { data: inserted, error: insertErr } = await admin
      .from('studio_assets')
      .insert({ project_id, user_id: user.id, type, status: 'processing', input_params, credits_cost: cost, board_order })
      .select()
      .single()
    if (insertErr || !inserted) return NextResponse.json({ error: insertErr?.message ?? 'Erro ao criar asset' }, { status: 500 })
    asset = inserted
  }

  // Dispatch de geração
  try {
    let resultUrl: string | null = null
    let extraData: Record<string, unknown> = {}

    if (type === 'image') {
      resultUrl = await generateImage({
        prompt: String(input_params.prompt ?? ''),
        style: String(input_params.style ?? 'ugc'),
        aspect_ratio: String(input_params.aspect_ratio ?? '1:1'),
        model_prompt: input_params.model_prompt ? String(input_params.model_prompt) : undefined,
        assetId: asset.id,
        userId: user.id,
      })
    } else if (type === 'model') {
      const { url, text } = await generateModel({
        gender:       String(input_params.gender       ?? 'feminino'),
        age_range:    String(input_params.age_range    ?? '20-30'),
        skin_tone:    String(input_params.skin_tone    ?? 'media'),
        body_type:    String(input_params.body_type    ?? 'normal'),
        style:        String(input_params.style        ?? 'casual'),
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

      // Resolução da imagem fonte:
      // 1. continuation_frame (video→video) — mas só se NÃO for áudio
      // 2. source_image_url (imagem normal)
      // Áudio conectado ao campo "Continuar" por engano é ignorado silenciosamente
      const AUDIO_EXTS = /\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i
      const continuationFrame = String(input_params.continuation_frame ?? '')
      const sourceImageUrl = (continuationFrame && !AUDIO_EXTS.test(continuationFrame))
        ? continuationFrame
        : String(input_params.source_image_url ?? '')

      await startVideoGeneration({
        source_image_url: sourceImageUrl,
        motion_prompt: String(input_params.motion_prompt ?? ''),
        duration: Number(input_params.duration ?? 5),
        model_prompt: input_params.model_prompt ? String(input_params.model_prompt) : undefined,
        assetId: asset.id,
        userId: user.id,
        appUrl,
      })
      return NextResponse.json({ asset: { ...asset, status: 'processing' } }, { status: 201 })

    } else if (type === 'animate') {
      const origin    = req.headers.get('origin') ?? req.headers.get('x-forwarded-host')
      const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
      const appUrl    = origin
        ? (origin.startsWith('http') ? origin : `https://${origin}`)
        : (process.env.NEXT_PUBLIC_APP_URL ?? vercelUrl ?? 'http://localhost:3000')
      // startAnimateGeneration agora é síncrono (Fal AI) — retorna URL diretamente
      resultUrl = await startAnimateGeneration({
        portrait_image_url: String(input_params.portrait_image_url ?? ''),
        driving_video_url:  String(input_params.driving_video_url  ?? ''),
        assetId: asset.id,
        userId: user.id,
        appUrl,
      })
    } else if (type === 'lipsync') {
      // startLipsyncGeneration é síncrono (polling inline) — retorna URL diretamente
      resultUrl = await startLipsyncGeneration({
        face_url:  String(input_params.face_url  ?? ''),
        audio_url: String(input_params.audio_url ?? ''),
        assetId: asset.id,
        userId:  user.id,
        appUrl:  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      })
    } else if (type === 'compose') {
      resultUrl = await composeProductScene({
        portrait_url:  String(input_params.portrait_url   ?? ''),
        product_url:   String(input_params.product_url    ?? ''),
        position:      (input_params.position as any)     ?? 'southeast',
        product_scale: input_params.product_scale ? Number(input_params.product_scale) : 0.35,
        assetId: asset.id,
        userId:  user.id,
      })
    } else if (type === 'render') {
      resultUrl = await mergeVideoAudio({
        video_url: String(input_params.source_image_url ?? ''),
        audio_url: String(input_params.audio_url ?? ''),
        assetId: asset.id,
        userId: user.id,
      })
    }

    // Operações síncronas — atualiza resultado e debita custo real
    await admin.from('studio_assets').update({
      status: 'done',
      result_url: resultUrl,
      input_params: { ...input_params, ...extraData },
    }).eq('id', asset.id)

    // Debita o custo real do asset (não sempre 1)
    for (let i = 0; i < cost; i++) {
      await admin.rpc('debit_credit', { user_id_param: user.id })
    }

    return NextResponse.json({
      asset: {
        ...asset,
        status: 'done',
        result_url: resultUrl,
        input_params: { ...input_params, ...extraData },
      }
    }, { status: 201 })

  } catch (err: any) {
    console.error(`[studio] Asset ${asset.id} falhou:`, err.message)
    await admin.from('studio_assets').update({ status: 'error', error_msg: err.message }).eq('id', asset.id)
    return NextResponse.json({ error: err.message, asset: { ...asset, status: 'error' } }, { status: 500 })
  }
}
