export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { analyzeImage, selectModel, MODEL_CONFIGS } from '@/lib/diagnose'
import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'

function getReplicate() {
  if (!process.env.REPLICATE_API_TOKEN) throw new Error('REPLICATE_API_TOKEN não configurada')
  return new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
}

async function getModelVersion(replicate: Replicate, modelFullName: string): Promise<string> {
  const [owner, name] = modelFullName.split('/')
  const modelInfo = await replicate.models.get(owner, name)
  const version = modelInfo.latest_version?.id
  if (!version) throw new Error(`No latest_version for ${modelFullName}`)
  return version
}

/* ─────────────────────────────────────────────────────────
   POST /api/restore
   Body: FormData { file: File, hint?: string }
   Kicks off Stage 1 (DDColor) with webhook to Stage 2 (Codeformer)
───────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check credits
  const { data: profile } = await supabase
    .from('users').select('credits, plan').eq('id', user.id).single()
  if (!profile || profile.credits < 1) {
    return NextResponse.json({ error: 'Sem créditos. Adquira um plano para continuar.' }, { status: 402 })
  }

  const formData = await req.formData()
  const file     = formData.get('file') as File

  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo: 50MB' }, { status: 400 })
  }

  // ── 1. Analyze image ──
  const arrayBuffer = await file.arrayBuffer()
  const buffer      = Buffer.from(arrayBuffer)

  let imageStats, diagnosis
  try {
    imageStats = await analyzeImage(buffer)
    diagnosis  = selectModel(imageStats)
  } catch {
    diagnosis = selectModel({ isGrayscale: false, isLowRes: true, isTooSmall: false, width: 0, height: 0, hasAlpha: false, avgBrightness: 128, saturation: 50 })
  }

  // ── 2. Upload original to Supabase Storage ──
  const ext      = file.name.split('.').pop() ?? 'jpg'
  const fileName = `${user.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(fileName, buffer, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: `Upload falhou: ${uploadError.message}` }, { status: 500 })

  const { data: { publicUrl: originalUrl } } = supabase.storage
    .from('photos').getPublicUrl(fileName)

  // ── 3. Create photo record ──
  const { data: photo, error: dbError } = await supabase
    .from('photos')
    .insert({
      user_id:      user.id,
      original_url: originalUrl,
      status:       'processing',
      model_used:   'piddnad/ddcolor', // Always starts with DDColor (Stage 1)
      diagnosis:    'Fase 1: Colorindo e melhorando cores...',
    })
    .select()
    .single()

  if (!photo || dbError) {
    return NextResponse.json({ error: 'Erro ao salvar no banco' }, { status: 500 })
  }

  // ── 4. Start Stage 1: DDColor ──
  let predictionId: string | null = null
  try {
    const replicate = getReplicate()
    const config    = MODEL_CONFIGS['piddnad/ddcolor']
    const input     = config.buildInput(originalUrl)

    // Build webhook URL with stage=stage1_colorize
    const headersList = await import('next/headers').then(m => m.headers())
    const host        = headersList.get('x-forwarded-host') || headersList.get('host') || 'revivai.vercel.app'
    const protocol    = headersList.get('x-forwarded-proto') || 'https'
    const baseUrl     = `${protocol}://${host}`

    const webhookUrl  = `${baseUrl}/api/webhooks/replicate?photoId=${photo.id}&userId=${user.id}&stage=stage1_colorize`
    const version     = await getModelVersion(replicate, 'piddnad/ddcolor')

    const prediction  = await replicate.predictions.create({
      version,
      input,
      webhook: webhookUrl,
      webhook_events_filter: ['completed'],
    } as any)

    predictionId = prediction.id
    console.log(`[reviv.ai] Stage 1 dispatched! ID: ${prediction.id}`)
  } catch (err: any) {
    console.error(`[reviv.ai] Error starting Stage 1 for ${photo.id}:`, err)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    await createAdminClient().from('photos').update({
      status:       'error',
      restored_url: `Erro ao iniciar IA: ${err.message}`,
    }).eq('id', photo.id)
  }

  return NextResponse.json({
    photoId: photo.id,
    predictionId,
    originalUrl,
    diagnosis: {
      label:       diagnosis.label,
      description: diagnosis.description,
      icon:        diagnosis.icon,
      confidence:  diagnosis.confidence,
      model:       diagnosis.model,
    },
    imageInfo: imageStats
      ? { width: imageStats.width, height: imageStats.height, isGrayscale: imageStats.isGrayscale }
      : null,
  })
}

/* ─────────────────────────────────────────────────────────
   GET /api/restore?photoId=xxx&predictionId=xxx
   Polls for the current status.
   Returns: { status, restored_url?, diagnosis? }
───────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const supabase        = await createClient()
  const { searchParams } = new URL(req.url)
  const photoId          = searchParams.get('photoId')
  const predictionId     = searchParams.get('predictionId')

  if (!photoId) return NextResponse.json({ error: 'photoId ausente' }, { status: 400 })

  const { data, error } = await supabase
    .from('photos')
    .select('status, restored_url, diagnosis, model_used, user_id')
    .eq('id', photoId)
    .single()

  if (error || !data) return NextResponse.json({ status: 'processing' })

  // ── Done or Error: return immediately ──────────────────────────────────────
  if (data.status === 'done' || data.status === 'error') {
    return NextResponse.json({
      status:       data.status,
      restored_url: data.restored_url,
      diagnosis:    data.diagnosis,
    })
  }

  // ── CHAIN state: Stage 2 was started by webhook, give frontend the new ID ──
  if (data.restored_url?.startsWith('CHAIN:')) {
    const parts       = data.restored_url.split(':')
    const chainPredId = parts[1]
    // parts[2] and beyond would be the intermediate colorized URL
    return NextResponse.json({
      status:          'processing',
      diagnosis:       data.diagnosis,
      newPredictionId: chainPredId,
    })
  }

  // ── Polling fallback: directly query Replicate if we have a predictionId ──
  if (predictionId) {
    try {
      const replicate    = getReplicate()
      const prediction   = await replicate.predictions.get(predictionId)
      const predStatus   = prediction.status

      if (predStatus === 'succeeded' && prediction.output) {
        // Extract URL
        let resultUrl: string | null = null
        if (typeof prediction.output === 'string')                    resultUrl = prediction.output
        else if (Array.isArray(prediction.output))                    resultUrl = prediction.output[0]
        else if (prediction.output && 'url' in (prediction.output as any)) resultUrl = (prediction.output as any).url

        if (!resultUrl) {
          return NextResponse.json({ status: 'processing', diagnosis: data.diagnosis })
        }

        // Determine which stage this was
        const isStage1 = data.model_used === 'piddnad/ddcolor' && !data.restored_url?.startsWith('CHAIN:')

        if (isStage1) {
          // Start Stage 2 via polling path
          const { createAdminClient } = await import('@/lib/supabase/admin')
          const adminClient           = createAdminClient()
          const replicate2            = getReplicate()
          const config                = MODEL_CONFIGS['sczhou/codeformer']
          const version               = await getModelVersion(replicate2, 'sczhou/codeformer')
          const input                 = config.buildInput(resultUrl)

          const headersList = await import('next/headers').then(m => m.headers())
          const host        = headersList.get('x-forwarded-host') || headersList.get('host') || 'revivai.vercel.app'
          const protocol    = headersList.get('x-forwarded-proto') || 'https'
          const webhookUrl  = `${protocol}://${host}/api/webhooks/replicate?photoId=${photoId}&userId=${data.user_id}&stage=stage2_restore`

          const chainedPrediction = await replicate2.predictions.create({
            version,
            input,
            webhook: webhookUrl,
            webhook_events_filter: ['completed'],
          } as any)

          await adminClient.from('photos').update({
            diagnosis:    'Fase 2: Restaurando rostos e detalhes...',
            restored_url: `CHAIN:${chainedPrediction.id}:${resultUrl}`,
          }).eq('id', photoId)

          return NextResponse.json({
            status:          'processing',
            diagnosis:       'Fase 2: Restaurando rostos e detalhes...',
            newPredictionId: chainedPrediction.id,
          })
        }

        // Stage 2 done via polling (webhook might have failed)
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const adminClient           = createAdminClient()
        await adminClient.from('photos').update({
          status:       'done',
          restored_url: resultUrl,
          diagnosis:    'Restauração concluída ✨',
        }).eq('id', photoId)
        await adminClient.rpc('debit_credit', { user_id_param: data.user_id })

        return NextResponse.json({
          status:       'done',
          restored_url: resultUrl,
          diagnosis:    'Restauração concluída ✨',
        })

      } else if (predStatus === 'failed' || predStatus === 'canceled') {
        const errMsg = prediction.error ? String(prediction.error) : 'Replicate rejeitou a predição'
        const { createAdminClient } = await import('@/lib/supabase/admin')
        await createAdminClient().from('photos').update({
          status:       'error',
          restored_url: `❌ ${errMsg}`,
        }).eq('id', photoId)
        return NextResponse.json({ status: 'error', restored_url: `A IA encontrou um erro: ${errMsg}` })
      }

      // Still running
      return NextResponse.json({ status: 'processing', diagnosis: data.diagnosis })

    } catch (err: any) {
      console.error('[restore GET] Polling error:', err)
      return NextResponse.json({ status: 'processing', diagnosis: data.diagnosis })
    }
  }

  return NextResponse.json({ status: 'processing', diagnosis: data.diagnosis })
}
