export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { createClient } from '@/lib/supabase/server'
import { analyzeImage, MODEL_CONFIGS, PipelineModel } from '@/lib/diagnose'
import {
  buildWebhookUrl,
  getPhaseLabel,
  encodePipeState,
  decodePipeState,
} from '@/lib/pipeline'
import { getModelVersion, createPredictionWithRetry } from '@/lib/replicate'
import { analyzeEnterpriseDamage } from '@/lib/openai'
import { restoreWithGemini } from '@/lib/gemini'

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

  // ── Diagnosis (for colorization suggestion only) ──
  const aiDiagnosis = await analyzeEnterpriseDamage(originalUrl)
  console.log(`[restore] Gemini restore | file=${file.name} | analysis:`, JSON.stringify(aiDiagnosis))

  // ── Create photo record (processing) ──
  const { data: photo, error: dbError } = await supabase
    .from('photos')
    .insert({
      user_id:         user.id,
      original_url:    originalUrl,
      status:          'processing',
      model_used:      'gemini-2.0-flash-exp',
      diagnosis:       'Restaurando com IA Gemini...',
      damage_analysis: aiDiagnosis,
    })
    .select()
    .single()

  if (!photo || dbError) {
    return NextResponse.json({ error: 'Erro ao salvar no banco' }, { status: 500 })
  }

  // ── Fetch restoration mode ──
  const modeId = formData.get('modeId') as string | null
  let modePrompt = 'Restore this old photograph. Remove scratches, dust, and damage while preserving all original details, faces, and composition.'
  let modeModel  = 'gemini-2.0-flash-exp-image-generation'

  let modePersona: string | null = null
  let modeRetryPrompt: string | null = null
  let modeQcThreshold = 70

  if (modeId) {
    const { createAdminClient: getAdmin } = await import('@/lib/supabase/admin')
    const { data: modeRow } = await getAdmin()
      .from('restoration_modes')
      .select('prompt, model, persona, retry_prompt, qc_threshold')
      .eq('id', modeId)
      .single()
    if (modeRow) {
      modePrompt      = modeRow.prompt
      modeModel       = modeRow.model
      modePersona     = modeRow.persona      ?? null
      modeRetryPrompt = modeRow.retry_prompt ?? null
      modeQcThreshold = modeRow.qc_threshold ?? 70
    }
  }

  const VALID_IMAGE_MODELS = new Set([
    'gemini-2.0-flash-exp-image-generation',
    'gemini-2.0-flash-preview-image-generation',
  ])
  if (!VALID_IMAGE_MODELS.has(modeModel)) {
    console.warn(`[restore] Modelo inválido "${modeModel}", usando fallback gemini-2.0-flash-exp-image-generation`)
    modeModel = 'gemini-2.0-flash-exp-image-generation'
  }

  console.log(`[restore] mode=${modeId ?? 'default'} model=${modeModel} persona=${!!modePersona} qc_threshold=${modeQcThreshold}`)

  // ── Prompts por tipo de foto ──
  const DOCUMENT_PROMPT = 'Restore this identity document photograph. Preserve the exact facial features and identity of the person. Use a clean white or neutral background. Apply ZERO beautification or artistic enhancement. Conservative, minimal-intervention approach only — remove only visible damage marks.'
  const GROUP_PROMPT = 'Restore this group photograph. Preserve every person\'s unique facial identity precisely — do not alter faces, expressions, age, or relative proportions between people. Remove only physical damage (scratches, stains, blur) while keeping all human features exactly as they are.'
  const CONSERVATIVE_PROMPT = 'Restore this photograph with minimal intervention. Remove only clearly visible damage marks (dust, scratches, stains). Do NOT change faces, expressions, composition, or overall appearance. Preserve everything as close to the original as possible.'
  const ULTRA_CONSERVATIVE_PROMPT = 'Remove only dust and scratches from this photograph. Preserve ALL other details exactly as they are — faces, expressions, clothing, background. Make no improvements to image quality beyond basic damage removal.'

  // Escolher prompt base pelo tipo detectado (se não tem modo customizado)
  const isDefaultMode = !modeId
  let effectivePrompt = modePrompt
  if (isDefaultMode) {
    if (aiDiagnosis.photo_type === 'document') effectivePrompt = DOCUMENT_PROMPT
    else if (aiDiagnosis.photo_type === 'group') effectivePrompt = GROUP_PROMPT
  }

  // Se risco alto, adicionar instrução de preservação mesmo em modo customizado
  if (aiDiagnosis.restoration_risk === 'high' && !effectivePrompt.includes('preserve')) {
    effectivePrompt = effectivePrompt + ' Preserve all facial features and identities exactly.'
  }

  const startTime = Date.now()

  // ── Restore with Gemini — 3-attempt strategy ──
  try {
    const { assessRestorationQualityV2 } = await import('@/lib/openai')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminClient = createAdminClient()

    interface AttemptResult {
      url: string
      qc: Awaited<ReturnType<typeof assessRestorationQualityV2>>
    }

    async function runAttempt(prompt: string, isRetry: boolean, tag: string): Promise<AttemptResult> {
      console.log(`[restore] Attempt ${tag} for ${photo.id} (photo_type=${aiDiagnosis.photo_type} risk=${aiDiagnosis.restoration_risk})`)
      const buf = await restoreWithGemini(cleanBuffer, prompt, modeModel, isRetry, modePersona, modeRetryPrompt)
      const fileName = `${user.id}/${Date.now()}_${tag}.jpg`
      const { error: upErr } = await supabase.storage.from('photos').upload(fileName, buf as any, { contentType: 'image/jpeg', upsert: false })
      if (upErr) throw new Error(`Upload ${tag} falhou: ${upErr.message}`)
      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName)
      const qc = await assessRestorationQualityV2(originalUrl, publicUrl, aiDiagnosis.photo_type, modeQcThreshold)
      console.log(`[restore] Attempt ${tag}: overall=${qc.overall_score} identity=${qc.identity_preservation} confidence=${qc.confidence}`)
      return { url: publicUrl, qc }
    }

    // Tentativa A — prompt principal
    const attemptA = await runAttempt(effectivePrompt, false, 'A')
    const attemptScores: number[] = [attemptA.qc.overall_score]

    let finalResult = attemptA
    let finalAttempt = 'A'

    // Tentativa B — se A falhou QC ou confiança baixa
    if (!attemptA.qc.passed || attemptA.qc.confidence === 'low') {
      try {
        const attemptB = await runAttempt(CONSERVATIVE_PROMPT, true, 'B')
        attemptScores.push(attemptB.qc.overall_score)
        if (attemptB.qc.overall_score > finalResult.qc.overall_score) {
          finalResult = attemptB; finalAttempt = 'B'
        }

        // Tentativa C — apenas para grupo/documento se B ainda baixo
        if (
          attemptB.qc.confidence === 'low' &&
          (aiDiagnosis.photo_type === 'group' || aiDiagnosis.photo_type === 'document')
        ) {
          try {
            const attemptC = await runAttempt(ULTRA_CONSERVATIVE_PROMPT, true, 'C')
            attemptScores.push(attemptC.qc.overall_score)
            if (attemptC.qc.overall_score > finalResult.qc.overall_score) {
              finalResult = attemptC; finalAttempt = 'C'
            }
          } catch (cErr: any) {
            console.warn('[restore] Tentativa C falhou:', cErr.message)
          }
        }
      } catch (bErr: any) {
        console.warn('[restore] Tentativa B falhou:', bErr.message)
      }
    }

    const qc = finalResult.qc
    const finalUrl = finalResult.url
    const confidenceFlag = qc.confidence === 'low' ? 'low' : null

    // Log estruturado
    console.log(JSON.stringify({
      event: 'restoration_complete',
      photoId: photo.id,
      userId: user.id,
      photo_type: aiDiagnosis.photo_type,
      face_count_estimate: aiDiagnosis.face_count_estimate,
      restoration_risk: aiDiagnosis.restoration_risk,
      attempt_scores: attemptScores,
      final_attempt: finalAttempt,
      confidence: qc.confidence,
      model: modeModel,
      duration_ms: Date.now() - startTime,
    }))

    // Salvar resultado
    await adminClient.from('photos').update({
      status:                 'done',
      restored_url:           finalUrl,
      diagnosis:              qc.passed ? 'Restauração concluída ✨' : 'Restauração entregue ⚠️',
      colorization_suggested: aiDiagnosis.is_grayscale_or_sepia,
      photo_type:             aiDiagnosis.photo_type,
      restoration_risk:       aiDiagnosis.restoration_risk,
      confidence_flag:        confidenceFlag,
      qc_scores: {
        overall:      qc.overall_score,
        identity:     qc.identity_preservation,
        visual:       qc.visual_quality,
        composition:  qc.composition_fidelity,
        hallucination: qc.hallucination_risk,
        attempt:      finalAttempt,
      },
    }).eq('id', photo.id)
    await adminClient.rpc('debit_credit', { user_id_param: user.id })

    return NextResponse.json({
      photoId:     photo.id,
      predictionId: null,
      originalUrl,
      restoredUrl: finalUrl,
      diagnosis: {
        label:       'Restauração Gemini IA',
        description: qc.passed ? 'Restauração concluída ✨' : 'Restauração entregue ⚠️',
        icon:        qc.confidence === 'low' ? '⚠️' : '✨',
        confidence:  qc.overall_score,
        model:       modeModel,
      },
      imageInfo: {
        width:       imageStats.width,
        height:      imageStats.height,
        isGrayscale: imageStats.isGrayscale,
      },
      pipeline:               [],
      colorization_suggested: aiDiagnosis.is_grayscale_or_sepia,
      confidence_flag:        confidenceFlag,
    })

  } catch (err: any) {
    console.error('[restore] Gemini failed:', err.message)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    await createAdminClient().from('photos').update({
      status:       'error',
      restored_url: `❌ Erro Gemini: ${err.message}`,
    }).eq('id', photo.id)

    return NextResponse.json({ error: `Falha na restauração: ${err.message}` }, { status: 500 })
  }
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
    // Sanity check: status=done but PIPE URL = race condition / data corruption
    // Treat as still processing rather than returning broken URL to frontend
    if (data.status === 'done' && data.restored_url?.startsWith('PIPE:')) {
      return NextResponse.json({ status: 'processing', diagnosis: data.diagnosis })
    }
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
        let nextStep  = currentStep + 1
        let nextModel = pipeline[nextStep]

        // FLUX Fill requires mask generation — only supported in webhook path.
        // Skip it in polling fallback to avoid 422 loop.
        if (nextModel === 'black-forest-labs/flux-fill-pro') {
          console.warn('[restore GET] Skipping flux-fill-pro in polling fallback — webhook handles it')
          nextStep  = nextStep + 1
          nextModel = pipeline[nextStep]
        }

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
