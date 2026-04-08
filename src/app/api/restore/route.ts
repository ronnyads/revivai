export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { createClient } from '@/lib/supabase/server'
import { analyzeImage, selectModel, MODEL_CONFIGS, PipelineModel } from '@/lib/diagnose'
import {
  buildEnterprisePipeline,
  buildWebhookUrl,
  getPhaseLabel,
  encodePipeState,
  decodePipeState,
} from '@/lib/pipeline'
import { getModelVersion, createPredictionWithRetry } from '@/lib/replicate'
import { analyzeEnterpriseDamage } from '@/lib/openai'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getReplicate() {
  if (!process.env.REPLICATE_API_TOKEN) throw new Error('REPLICATE_API_TOKEN não configurada')
  return new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
}

async function getBaseUrlFromHeaders(): Promise<string> {
  const headers    = await import('next/headers').then(m => m.headers())
  const host       = headers.get('x-forwarded-host') || headers.get('host') || 'revivai.vercel.app'
  const protocol   = headers.get('x-forwarded-proto') || 'https'
  return `${protocol}://${host}`
}

function extractUrl(output: unknown): string | null {
  if (typeof output === 'string' && output.startsWith('http')) return output
  if (Array.isArray(output) && typeof output[0] === 'string')  return output[0]
  if (output && typeof output === 'object' && 'url' in output) return (output as any).url
  return null
}

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/restore
   Body: FormData { file: File }
   Analyzes image, builds pipeline, kicks off Stage 1
───────────────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── Credit check ──
  const { data: profile } = await supabase
    .from('users').select('credits').eq('id', user.id).single()
  if (!profile || profile.credits < 1) {
    return NextResponse.json(
      { error: 'Sem créditos. Adquira um plano para continuar.' },
      { status: 402 }
    )
  }

  // ── Parse file ──
  const formData = await req.formData()
  const file     = formData.get('file') as File

  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo: 50MB' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer      = Buffer.from(arrayBuffer)

  // ── Analyze image ──
  let imageStats
  try {
    imageStats = await analyzeImage(buffer)
  } catch {
    imageStats = { isGrayscale: false, isLowRes: true, isTooSmall: false, width: 0, height: 0, hasAlpha: false, avgBrightness: 128, saturation: 50 }
  }

  // ── Normalize Image (Strip Alpha to fix Microsoft/Replicate bugs) ──
  let cleanBuffer: Buffer = buffer
  try {
    const sharp = (await import('sharp')).default
    cleanBuffer = (await sharp(buffer as any)
      .flatten({ background: { r: 255, g: 255, b: 255 } }) // Removes transparency that breaks masks
      .jpeg({ quality: 100 })
      .toBuffer()) as Buffer
  } catch (e) {
    console.error('[restore] Falha ao limpar imagem, usando original', e)
  }

  // ── Upload original photo ──
  const fileName = `${user.id}/${Date.now()}.jpg`

  const { error: uploadError } = await supabase.storage
    .from('photos').upload(fileName, cleanBuffer as any, { contentType: 'image/jpeg', upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: `Upload falhou: ${uploadError.message}` }, { status: 500 })
  }

  const { data: { publicUrl: originalUrl } } = supabase.storage
    .from('photos').getPublicUrl(fileName)

  // ── Enterprise Diagnosis (GPT-4o-mini Vision) ──
  const aiDiagnosis = await analyzeEnterpriseDamage(originalUrl)
  const pipeline    = buildEnterprisePipeline(aiDiagnosis)

  console.log(`[restore] Enterprise Pipeline for ${file.name}:`, pipeline, '| Analysis:', JSON.stringify(aiDiagnosis))

  // ── Create photo record ──
  const firstModel  = pipeline[0]
  const firstPhase  = getPhaseLabel(0, pipeline.length, firstModel)

  const { data: photo, error: dbError } = await supabase
    .from('photos')
    .insert({
      user_id:         user.id,
      original_url:    originalUrl,
      status:          'processing',
      model_used:      pipeline.join(','),
      diagnosis:       firstPhase,
      damage_analysis: aiDiagnosis,
    })
    .select()
    .single()

  if (!photo || dbError) {
    return NextResponse.json({ error: 'Erro ao salvar no banco' }, { status: 500 })
  }

  // ── Launch Stage 1 ──
  let predictionId: string | null = null

  try {
    const replicate = getReplicate()
    const baseUrl   = await getBaseUrlFromHeaders()
    const config    = MODEL_CONFIGS[firstModel]
    const input     = config.buildInput(originalUrl)
    const version   = await getModelVersion(replicate, config.name)

    const webhookUrl = buildWebhookUrl(baseUrl, {
      photoId:  photo.id,
      userId:   user.id,
      step:     0,
      pipeline,
      bestUrl:  '',
      inputW:   imageStats.width,
      inputH:   imageStats.height,
      isGray:   imageStats.isGrayscale,
      retry:    0,
    })

    const prediction = await createPredictionWithRetry(replicate, {
      version,
      input,
      webhook: webhookUrl,
      webhook_events_filter: ['completed'],
    })

    predictionId = prediction.id as string

    // Store PIPE state in DB
    await supabase.from('photos').update({
      restored_url: encodePipeState(0, predictionId),
    }).eq('id', photo.id)

    console.log(`[restore] Stage 1 (${firstModel}) dispatched: ${predictionId}`)
  } catch (err: any) {
    console.error('[restore] Failed to launch Stage 1:', err.message)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    await createAdminClient().from('photos').update({
      status:       'error',
      restored_url: `❌ Erro ao iniciar IA: ${err.message}`,
    }).eq('id', photo.id)
  }

  return NextResponse.json({
    photoId:     photo.id,
    predictionId,
    originalUrl,
    diagnosis: {
      label: aiDiagnosis.damage_severity === 'severe'   ? 'Restauração Extrema'  :
             aiDiagnosis.damage_severity === 'moderate' ? 'Restauração Avançada' : 'Restauração Leve',
      description: firstPhase,
      icon:  aiDiagnosis.has_tears_or_holes || aiDiagnosis.has_scratches ? '✂️' :
             aiDiagnosis.has_blur           ? '🔍' :
             aiDiagnosis.has_grain_or_noise ? '🎞️' : '✨',
      confidence: 99,
      model: pipeline[0],
    },
    imageInfo: {
      width:      imageStats.width,
      height:     imageStats.height,
      isGrayscale: imageStats.isGrayscale,
    },
    pipeline, // inform frontend how many stages
  })
}

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/restore?photoId=xxx&predictionId=xxx
   Polls for current status. Handles PIPE state + direct Replicate polling.
───────────────────────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const supabase        = await createClient()
  const { searchParams } = new URL(req.url)
  const photoId          = searchParams.get('photoId')
  const predictionId     = searchParams.get('predictionId')

  if (!photoId) return NextResponse.json({ error: 'photoId ausente' }, { status: 400 })

  const { data, error } = await supabase
    .from('photos')
    .select('status, restored_url, diagnosis, model_used, user_id, colorization_suggested, colorization_url')
    .eq('id', photoId)
    .single()

  if (error || !data) return NextResponse.json({ status: 'processing' })

  // ── Terminal states ────────────────────────────────────────────────────────
  if (data.status === 'done' || data.status === 'error') {
    return NextResponse.json({
      status:                   data.status,
      restored_url:             data.restored_url,
      diagnosis:                data.diagnosis,
      colorization_suggested:   data.colorization_suggested ?? false,
      colorization_url:         data.colorization_url ?? null,
    })
  }

  // ── PIPE state: webhook updated the step, give frontend the new predId  ──
  const pipeState = decodePipeState(data.restored_url ?? '')
  if (pipeState) {
    const { predictionId: dbPredId, stepIndex } = pipeState
    // If the DB has a different (newer) predictionId than what the frontend knows
    if (dbPredId && dbPredId !== predictionId) {
      return NextResponse.json({
        status:          'processing',
        diagnosis:       data.diagnosis,
        newPredictionId: dbPredId,
        stepIndex,
      })
    }
  }

  // ── Polling fallback: directly query Replicate ─────────────────────────────
  if (predictionId) {
    try {
      const replicate  = getReplicate()
      const prediction = await replicate.predictions.get(predictionId)

      if (prediction.status === 'succeeded' && prediction.output) {
        const resultUrl = extractUrl(prediction.output)
        if (!resultUrl) {
          return NextResponse.json({ status: 'processing', diagnosis: data.diagnosis })
        }

        // Parse the pipeline from model_used column
        const pipeline: PipelineModel[] = (data.model_used ?? '')
          .split(',').filter(Boolean) as PipelineModel[]

        const currentStep = pipeState?.stepIndex ?? 0
        const isLastStep  = currentStep === pipeline.length - 1

        if (isLastStep) {
          // Final step done via polling (webhook may have missed it)
          const { createAdminClient } = await import('@/lib/supabase/admin')
          const adminClient = createAdminClient()
          await adminClient.from('photos').update({
            status:       'done',
            restored_url: resultUrl,
            diagnosis:    'Restauração concluída ✨',
          }).eq('id', photoId)
          await adminClient.rpc('debit_credit', { user_id_param: data.user_id })

          return NextResponse.json({ status: 'done', restored_url: resultUrl, diagnosis: 'Restauração concluída ✨' })
        }

        // Not the last step — launch next step via polling path
        const nextStep  = currentStep + 1
        const nextModel = pipeline[nextStep]

        if (!nextModel) {
          return NextResponse.json({ status: 'processing', diagnosis: data.diagnosis })
        }

        try {
          const replicate2  = getReplicate()
          const baseUrl     = await getBaseUrlFromHeaders()
          const version     = await getModelVersion(replicate2, MODEL_CONFIGS[nextModel].name)
          const input       = MODEL_CONFIGS[nextModel].buildInput(resultUrl)

          const webhookUrl  = buildWebhookUrl(baseUrl, {
            photoId,
            userId:   data.user_id,
            step:     nextStep,
            pipeline,
            bestUrl:  resultUrl,
            inputW:   0, inputH: 0,
            isGray:   false,
            retry:    0,
          })

          const chainedPred = await createPredictionWithRetry(replicate2, {
            version, input, webhook: webhookUrl,
            webhook_events_filter: ['completed'],
          })

          const { createAdminClient } = await import('@/lib/supabase/admin')
          await createAdminClient().from('photos').update({
            diagnosis:    getPhaseLabel(nextStep, pipeline.length, nextModel),
            restored_url: encodePipeState(nextStep, chainedPred.id),
          }).eq('id', photoId)

          return NextResponse.json({
            status:          'processing',
            diagnosis:       getPhaseLabel(nextStep, pipeline.length, nextModel),
            newPredictionId: chainedPred.id,
          })
        } catch (chainErr: any) {
          console.error('[restore GET] Failed to chain next step:', chainErr.message)
          const { createAdminClient } = await import('@/lib/supabase/admin')
          await createAdminClient().from('photos').update({
            diagnosis: `Fall back polling retry error: ${chainErr.message}`
          }).eq('id', photoId)
          return NextResponse.json({ status: 'processing', diagnosis: data.diagnosis })
        }

      } else if (prediction.status === 'failed' || prediction.status === 'canceled') {
        const errMsg = prediction.error ? String(prediction.error) : 'Replicate rejeitou'
        const { createAdminClient } = await import('@/lib/supabase/admin')
        await createAdminClient().from('photos').update({
          status:       'error',
          restored_url: `❌ ${errMsg}`,
        }).eq('id', photoId)
        return NextResponse.json({ status: 'error', restored_url: `A IA encontrou um erro: ${errMsg}` })
      }

      // Still running
      return NextResponse.json({ status: 'processing', diagnosis: data.diagnosis })

    } catch (pollErr: any) {
      console.warn('[restore GET] Poll error (non-blocking):', pollErr.message)
      return NextResponse.json({ status: 'processing', diagnosis: data.diagnosis })
    }
  }

  return NextResponse.json({ status: 'processing', diagnosis: data.diagnosis })
}
