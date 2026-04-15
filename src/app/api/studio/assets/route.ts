export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CREDIT_COST, generateImage, generateScript, generateVoice, generateCaption, generateUpscale, startVideoGeneration } from '@/lib/studio'
import { AssetType } from '@/types'

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/studio/assets — cria asset e dispara geração
   Body: { project_id, type, input_params }
───────────────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { project_id, type, input_params } = body as { project_id: string; type: AssetType; input_params: Record<string, unknown> }

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

  // Conta assets existentes para board_order
  const { count } = await supabase
    .from('studio_assets')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', project_id)
  const board_order = (count ?? 0)

  const admin = createAdminClient()

  // Cria o asset com status processing
  const { data: asset, error: insertErr } = await admin
    .from('studio_assets')
    .insert({
      project_id,
      user_id: user.id,
      type,
      status: 'processing',
      input_params,
      credits_cost: cost,
      board_order,
    })
    .select()
    .single()

  if (insertErr || !asset) return NextResponse.json({ error: insertErr?.message ?? 'Erro ao criar asset' }, { status: 500 })

  // Dispatch de geração
  try {
    let resultUrl: string | null = null
    let extraData: Record<string, unknown> = {}

    if (type === 'image') {
      resultUrl = await generateImage({
        prompt: String(input_params.prompt ?? ''),
        style: String(input_params.style ?? 'ugc'),
        aspect_ratio: String(input_params.aspect_ratio ?? '1:1'),
        assetId: asset.id,
        userId: user.id,
      })
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
      // Assíncrono — webhook atualiza status
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      await startVideoGeneration({
        source_image_url: String(input_params.source_image_url ?? ''),
        motion_prompt: String(input_params.motion_prompt ?? ''),
        duration: Number(input_params.duration ?? 5),
        assetId: asset.id,
        userId: user.id,
        appUrl,
      })
      return NextResponse.json({ asset: { ...asset, status: 'processing' } }, { status: 201 })
    }

    // Operações síncronas — atualiza resultado e debita crédito
    await admin.from('studio_assets').update({
      status: 'done',
      result_url: resultUrl,
      input_params: { ...input_params, ...extraData },
    }).eq('id', asset.id)

    await admin.rpc('debit_credit', { user_id_param: user.id })

    return NextResponse.json({ asset: { ...asset, status: 'done', result_url: resultUrl } }, { status: 201 })

  } catch (err: any) {
    console.error(`[studio] Asset ${asset.id} falhou:`, err.message)
    await admin.from('studio_assets').update({ status: 'error', error_msg: err.message }).eq('id', asset.id)
    return NextResponse.json({ error: err.message, asset: { ...asset, status: 'error' } }, { status: 500 })
  }
}
