export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { analyzeImage, selectModel, MODEL_CONFIGS } from '@/lib/diagnose'
import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'

// Lazy Replicate client
function getReplicate() {
  if (!process.env.REPLICATE_API_TOKEN) throw new Error('REPLICATE_API_TOKEN não configurada')
  return new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
}

/* ─────────────────────────────────────────────────────────
   POST /api/restore
   Body: FormData { file: File, hint?: string }
   Returns: { photoId, originalUrl, diagnosis }
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
  const hint     = formData.get('hint') as string | undefined // 'colorize' | 'face' | 'inpaint'

  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo: 50MB' }, { status: 400 })
  }

  // ── 1. Read buffer and analyze with Sharp ──
  const arrayBuffer = await file.arrayBuffer()
  const buffer      = Buffer.from(arrayBuffer)

  let imageStats, diagnosis
  try {
    imageStats = await analyzeImage(buffer)
    diagnosis  = selectModel(imageStats, hint ?? undefined)
  } catch {
    // Fallback if Sharp fails (e.g. unsupported format)
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
      model_used:   diagnosis.model,
      diagnosis:    diagnosis.label,
    })
    .select()
    .single()

  if (!photo || dbError) {
    return NextResponse.json({ error: 'Erro ao salvar no banco' }, { status: 500 })
  }

  // ── 4. Start AI restoration (returns instantly after dispatching to Replicate) ──
  const baseUrl = new URL(req.url).origin
  const predictionId = await runRestoration({ photoId: photo.id, originalUrl, diagnosis, userId: user.id, baseUrl })

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
   GET /api/restore?photoId=xxx
   Returns: { status, restored_url?, progress? }
───────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const supabase    = await createClient()
  const { searchParams } = new URL(req.url)
  const photoId     = searchParams.get('photoId')
  const predictionId = searchParams.get('predictionId')

  if (!photoId) return NextResponse.json({ error: 'Parâmetro photoId ausente' }, { status: 400 })

  const { data, error } = await supabase
    .from('photos')
    .select('status, restored_url, model_used, diagnosis, user_id')
    .eq('id', photoId)
    .single()

  if (error || !data) return NextResponse.json({ status: 'processing' })

  // If Supabase already knows it's done or failed, return it immediately
  if (data.status === 'done' || data.status === 'error') {
    return NextResponse.json(data)
  }

  // If Supabase still says 'processing' and we have a predictionId, directly poll Replicate!
  if (predictionId && data.status === 'processing') {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const adminClient = createAdminClient()
      const replicate = getReplicate()
      
      const prediction = await replicate.predictions.get(predictionId)
      
      if (prediction.status === 'succeeded' && prediction.output) {
        let restoredUrl: string
        if (typeof prediction.output === 'string') {
          restoredUrl = prediction.output
        } else if (Array.isArray(prediction.output)) {
          restoredUrl = prediction.output[0]
        } else if (prediction.output && typeof prediction.output === 'object' && 'url' in prediction.output) {
          restoredUrl = prediction.output.url as string
        } else {
          return NextResponse.json({ status: 'processing' }) // Wait for next tick if weird
        }

        console.log(`[reviv.ai polling] Success! ${photoId} -> ${restoredUrl}`)

        // Update DB
        await adminClient.from('photos').update({
          restored_url: restoredUrl,
          status: 'done',
        }).eq('id', photoId)

        await adminClient.rpc('debit_credit', { user_id_param: data.user_id })

        return NextResponse.json({ status: 'done', restored_url: restoredUrl })
      } else if (prediction.status === 'failed' || prediction.status === 'canceled') {
        const errorMsg = prediction.error ? String(prediction.error) : 'Replicate API rejected the picture'
        await adminClient.from('photos').update({ status: 'error', restored_url: `Polling fallback: ${errorMsg}` }).eq('id', photoId)
        return NextResponse.json({ status: 'error', restored_url: `Polling fallback: ${errorMsg}` })
      }
    } catch (pollErr) {
      console.error(`[reviv.ai] Polling error for ${predictionId}:`, pollErr)
    }
  }

  return NextResponse.json(data)
}

/* ─────────────────────────────────────────────────────────
   Async AI runner — using Webhooks to bypass 10s timeout!
───────────────────────────────────────────────────────── */
async function runRestoration({
  photoId,
  originalUrl,
  diagnosis,
  userId,
  baseUrl // Passed from req.url
}: {
  photoId: string
  originalUrl: string
  diagnosis: ReturnType<typeof selectModel>
  userId: string
  baseUrl: string
}) {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const supabase = createAdminClient()

  try {
    const replicate = getReplicate()
    const config    = MODEL_CONFIGS[diagnosis.model]
    const input     = config.buildInput(originalUrl)

    // Get host from headers as req.url can be unreliable on some serverless platforms
    const headersList = await import('next/headers').then(m => m.headers())
    const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'revivai.vercel.app'
    const protocol = headersList.get('x-forwarded-proto') || 'https'
    const baseHostUrl = `${protocol}://${host}`

    const webhookUrl = `${baseHostUrl}/api/webhooks/replicate?photoId=${photoId}&userId=${userId}`

    // Start model prediction without needing version hashes!
    const owner = config.name.split('/')[0]
    const modelName = config.name.split('/')[1]
    
    // Fallback: stable models
    const predictionUrl = `https://api.replicate.com/v1/models/${owner}/${modelName}/predictions`

    // Actually replicate.models.predictions.create(...) exists in 1.x
    // but the safest generic way using the Replicate CLI object if TS typing fails:
    const prediction = await replicate.predictions.create({
      model: `${owner}/${modelName}`, // modern Replicate feature, auto resolves latest version!
      input,
      webhook: webhookUrl,
      webhook_events_filter: ["completed"]
    } as any)

    console.log(`[reviv.ai] Prediction dispatched! Webhook attached. Prediction ID: ${prediction.id}`)
    return prediction.id
  } catch (err: any) {
    console.error(`[reviv.ai] Error restoring ${photoId}:`, err)
    await supabase.from('photos').update({ 
      status: 'error',
      restored_url: err.message || JSON.stringify(err)
    }).eq('id', photoId)
    return null
  }
}
