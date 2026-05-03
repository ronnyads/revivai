export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { analyzeImage, type ImageStats } from '@/lib/diagnose'
import { insertPhotoCompat, updatePhotoCompat } from '@/lib/photos-schema-compat'
import { checkRateLimit, getRateLimitInfo } from '@/lib/rateLimit'
import { createClient } from '@/lib/supabase/server'
import {
  getRestoreEngineFriendlyName,
  getRestorePrimaryModelId,
  inferRestoreEngineProfile,
} from '@/lib/vertex-engines'
import {
  analyzeRestorationImageWithVertex,
  assessRestorationQualityWithVertex,
  maybeUpscaleRestorationWithVertex,
  restorePhotoWithVertex,
} from '@/lib/vertexRestore'

const DOCUMENT_PROMPT = 'Restore this identity document photograph. Preserve the exact facial features and identity of the person. Use a clean white or neutral background. Apply zero beautification or artistic enhancement. Conservative minimal-intervention approach only.'
const GROUP_PROMPT = 'Restore this group photograph. Preserve every person unique facial identity precisely. Do not alter faces, expressions, age, or relative proportions between people. Remove only physical damage, scratches, stains and blur while keeping human features exactly as they are.'
const CONSERVATIVE_PROMPT = 'Restore this photograph with minimal intervention. Remove only clearly visible damage marks, dust, scratches and stains. Do not change faces, expressions, composition or overall appearance.'
const ULTRA_CONSERVATIVE_PROMPT = 'Remove only dust and scratches from this photograph. Preserve all other details exactly as they are, including faces, expressions, clothing, background and composition.'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rateLimitPassed = checkRateLimit(user.id, 'restore', { max: 5, windowMs: 60_000 })
  if (!rateLimitPassed) {
    const info = getRateLimitInfo(user.id, 'restore', { max: 5, windowMs: 60_000 })
    return NextResponse.json(
      { error: 'Muitas requisicoes. Aguarde um momento antes de tentar novamente.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': String(info.remaining),
          'X-RateLimit-Reset': String(Math.ceil(info.resetAt / 1000)),
          'Retry-After': String(Math.ceil((info.resetAt - Date.now()) / 1000)),
        },
      },
    )
  }

  const { data: profile } = await supabase.from('users').select('credits').eq('id', user.id).single()
  if (!profile || profile.credits < 1) {
    return NextResponse.json({ error: 'Sem creditos. Adquira um plano para continuar.' }, { status: 402 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
  }
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo muito grande. Maximo: 50MB' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const userId = user.id

  let imageStats: ImageStats
  try {
    imageStats = await analyzeImage(buffer)
  } catch {
    imageStats = {
      isGrayscale: false,
      isLowRes: true,
      isTooSmall: false,
      width: 0,
      height: 0,
      hasAlpha: false,
      avgBrightness: 128,
      saturation: 50,
    }
  }

  let cleanBuffer = Buffer.from(arrayBuffer)
  try {
    const sharp = (await import('sharp')).default
    const normalizedBuffer = await sharp(buffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 100 })
      .toBuffer()
    cleanBuffer = Buffer.from(normalizedBuffer)
  } catch (error) {
    console.error('[restore] failed to normalize image, using original', error)
  }

  const modeId = formData.get('modeId') as string | null
  let modeName = 'Restauracao Geral'
  let modePrompt = 'Restore this old photograph. Remove scratches, dust, and damage while preserving all original details, faces, and composition.'
  let modeLegacyModel = 'restore-managed-by-engine-profile'
  let modePersona: string | null = null
  let modeRetryPrompt: string | null = null
  let modeQcThreshold = 70
  let engineProfile = inferRestoreEngineProfile({ modeName, legacyModel: modeLegacyModel })

  if (modeId) {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { data: modeRow } = await createAdminClient()
      .from('restoration_modes')
      .select('name, prompt, model, engine_profile, persona, retry_prompt, qc_threshold')
      .eq('id', modeId)
      .single()

    if (modeRow) {
      modeName = modeRow.name ?? modeName
      modePrompt = modeRow.prompt ?? modePrompt
      modeLegacyModel = modeRow.model ?? modeLegacyModel
      modePersona = modeRow.persona ?? null
      modeRetryPrompt = modeRow.retry_prompt ?? null
      modeQcThreshold = modeRow.qc_threshold ?? 70
      engineProfile = inferRestoreEngineProfile({
        explicitProfile: modeRow.engine_profile,
        legacyModel: modeRow.model,
        modeName: modeRow.name,
      })
    }
  }

  const originalFileName = `${userId}/${Date.now()}.jpg`
  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(originalFileName, cleanBuffer, { contentType: 'image/jpeg', upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: `Upload falhou: ${uploadError.message}` }, { status: 500 })
  }

  const {
    data: { publicUrl: originalUrl },
  } = supabase.storage.from('photos').getPublicUrl(originalFileName)

  const { analysis: aiDiagnosis, modelId: analysisModelId } = await analyzeRestorationImageWithVertex(originalUrl)

  let effectivePrompt = modePrompt
  if (!modeId) {
    if (aiDiagnosis.photo_type === 'document') {
      effectivePrompt = DOCUMENT_PROMPT
    } else if (aiDiagnosis.photo_type === 'group') {
      effectivePrompt = GROUP_PROMPT
    }
  }

  if (aiDiagnosis.restoration_risk === 'high' && !effectivePrompt.toLowerCase().includes('preserve')) {
    effectivePrompt = `${effectivePrompt} Preserve all facial features and identities exactly.`
  }

  const { data: photo, error: photoInsertError } = await insertPhotoCompat({
    client: supabase,
    payload: {
      user_id: user.id,
      original_url: originalUrl,
      status: 'processing',
      model_used: `vertex-restore:${engineProfile}`,
      engine_profile: engineProfile,
      analysis_model_id: analysisModelId,
      diagnosis: 'Restauracao premium em andamento...',
      damage_analysis: {
        ...aiDiagnosis,
        provider: 'vertex',
        mode_name: modeName,
      },
    },
    selectSingle: true,
  })

  if (!photo || photoInsertError) {
    return NextResponse.json({ error: 'Erro ao salvar no banco' }, { status: 500 })
  }

  const startTime = Date.now()

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminClient = createAdminClient()

    interface AttemptResult {
      diagnostics: Awaited<ReturnType<typeof restorePhotoWithVertex>>['diagnostics']
      qc: Awaited<ReturnType<typeof assessRestorationQualityWithVertex>>
      renderModelId: string
      upscaleModelId: string | null
      url: string
    }

    async function runAttempt(prompt: string, tag: string): Promise<AttemptResult> {
      const restored = await restorePhotoWithVertex({
        analysis: aiDiagnosis,
        cleanBuffer,
        modeName,
        prompt,
        engineProfile,
        persona: modePersona,
      })

      let finalBuffer = restored.buffer
      let upscaleModelId: string | null = null

      if (imageStats.isLowRes) {
        try {
          const upscaled = await maybeUpscaleRestorationWithVertex({
            buffer: restored.buffer,
            enabled: true,
          })
          finalBuffer = upscaled.buffer
          upscaleModelId = upscaled.modelId
        } catch (error: any) {
          console.warn(`[restore] upscale skipped on attempt ${tag}: ${error.message}`)
        }
      }

      const attemptFileName = `${userId}/${Date.now()}_${tag}.jpg`
      const { error: attemptUploadError } = await supabase.storage
        .from('photos')
        .upload(attemptFileName, finalBuffer, { contentType: 'image/jpeg', upsert: false })

      if (attemptUploadError) {
        throw new Error(`Upload ${tag} falhou: ${attemptUploadError.message}`)
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('photos').getPublicUrl(attemptFileName)

      const qc = await assessRestorationQualityWithVertex(
        originalUrl,
        publicUrl,
        aiDiagnosis.photo_type,
        modeQcThreshold,
      )

      console.log(
        `[restore] provider=vertex attempt=${tag} overall=${qc.overall_score} identity=${qc.identity_preservation} confidence=${qc.confidence} fallback=${restored.diagnostics.fallbackUsed ? 'yes' : 'no'} mask=${restored.diagnostics.maskUsed ? 'yes' : 'no'}`,
      )

      return {
        diagnostics: restored.diagnostics,
        qc,
        renderModelId: restored.modelId,
        upscaleModelId,
        url: publicUrl,
      }
    }

    const attemptA = await runAttempt(effectivePrompt, 'A')
    const attemptScores: number[] = [attemptA.qc.overall_score]
    let finalResult = attemptA
    let finalAttempt = 'A'

    if (!attemptA.qc.passed || attemptA.qc.confidence === 'low') {
      try {
        const attemptB = await runAttempt(modeRetryPrompt || CONSERVATIVE_PROMPT, 'B')
        attemptScores.push(attemptB.qc.overall_score)
        if (attemptB.qc.overall_score > finalResult.qc.overall_score) {
          finalResult = attemptB
          finalAttempt = 'B'
        }

        if (attemptB.qc.confidence === 'low' && (aiDiagnosis.photo_type === 'group' || aiDiagnosis.photo_type === 'document')) {
          try {
            const attemptC = await runAttempt(ULTRA_CONSERVATIVE_PROMPT, 'C')
            attemptScores.push(attemptC.qc.overall_score)
            if (attemptC.qc.overall_score > finalResult.qc.overall_score) {
              finalResult = attemptC
              finalAttempt = 'C'
            }
          } catch (error: any) {
            console.warn('[restore] attempt C failed:', error.message)
          }
        }
      } catch (error: any) {
        console.warn('[restore] attempt B failed:', error.message)
      }
    }

    const qc = finalResult.qc
    const confidenceFlag = qc.confidence === 'low' ? 'low' : null
    const engineLabel = getRestoreEngineFriendlyName(engineProfile)
    const targetModelId = getRestorePrimaryModelId()

    await updatePhotoCompat({
      client: adminClient,
      payload: {
        status: 'done',
        restored_url: finalResult.url,
        diagnosis: qc.passed ? 'Restauracao concluida' : 'Restauracao entregue com alerta',
        model_used: `vertex-restore:${engineProfile}:${finalResult.renderModelId}`,
        engine_profile: engineProfile,
        analysis_model_id: analysisModelId,
        target_model_id: targetModelId,
        render_model_id: finalResult.renderModelId,
        upscale_model_id: finalResult.upscaleModelId,
        colorization_suggested: aiDiagnosis.is_grayscale_or_sepia,
        photo_type: aiDiagnosis.photo_type,
        restoration_risk: aiDiagnosis.restoration_risk,
        confidence_flag: confidenceFlag,
        damage_analysis: {
          ...aiDiagnosis,
          provider: 'vertex',
          mode_name: modeName,
          engine_profile: engineProfile,
          engine_label: engineLabel,
          target_model_id: targetModelId,
          runtime_model_id: finalResult.renderModelId,
          restore_primary_model_id: finalResult.diagnostics.primaryModelId,
          restore_fallback_used: finalResult.diagnostics.fallbackUsed,
          restore_fallback_reason: finalResult.diagnostics.fallbackReason,
          restore_mask_used: finalResult.diagnostics.maskUsed,
          restore_mask_profile: finalResult.diagnostics.maskProfile,
          restore_mask_coverage_ratio: finalResult.diagnostics.maskCoverageRatio,
          restore_face_zone_coverage_ratio: finalResult.diagnostics.faceZoneCoverageRatio,
          restore_strategy: finalResult.diagnostics.restoreStrategy,
        },
        qc_scores: {
          overall: qc.overall_score,
          identity: qc.identity_preservation,
          visual: qc.visual_quality,
          composition: qc.composition_fidelity,
          hallucination: qc.hallucination_risk,
          attempt: finalAttempt,
          fallback_used: finalResult.diagnostics.fallbackUsed,
          mask_used: finalResult.diagnostics.maskUsed,
          mask_profile: finalResult.diagnostics.maskProfile,
        },
      },
      filters: [{ column: 'id', value: photo.id }],
    })

    await adminClient.rpc('debit_credit', { user_id_param: user.id })

    console.log(
      JSON.stringify({
        event: 'restoration_complete',
        provider: 'vertex',
        photoId: photo.id,
        userId: user.id,
        engine_profile: engineProfile,
        analysis_model_id: analysisModelId,
        target_model_id: targetModelId,
        render_model_id: finalResult.renderModelId,
        upscale_model_id: finalResult.upscaleModelId,
        restore_fallback_used: finalResult.diagnostics.fallbackUsed,
        restore_mask_used: finalResult.diagnostics.maskUsed,
        restore_mask_profile: finalResult.diagnostics.maskProfile,
        photo_type: aiDiagnosis.photo_type,
        restoration_risk: aiDiagnosis.restoration_risk,
        attempt_scores: attemptScores,
        final_attempt: finalAttempt,
        confidence: qc.confidence,
        duration_ms: Date.now() - startTime,
      }),
    )

    return NextResponse.json({
      photoId: photo.id,
      predictionId: null,
      originalUrl,
      restoredUrl: finalResult.url,
      diagnosis: {
        label: modeName,
        description: qc.passed ? 'Restauracao concluida' : 'Restauracao entregue com alerta',
        icon: qc.confidence === 'low' ? 'alert' : 'ok',
        confidence: qc.overall_score,
        model: 'Gerenciado pelo ReviVai',
        engineLabel: 'Restauracao premium',
        runtimeModelId: finalResult.renderModelId,
      },
      imageInfo: {
        width: imageStats.width,
        height: imageStats.height,
        isGrayscale: imageStats.isGrayscale,
      },
      pipeline: [],
      colorization_suggested: aiDiagnosis.is_grayscale_or_sepia,
      confidence_flag: confidenceFlag,
    })
  } catch (error: any) {
    console.error('[restore] Vertex failed:', error.message)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    await updatePhotoCompat({
      client: createAdminClient(),
      payload: {
        status: 'error',
        restored_url: `ERROR: ${error.message}`,
      },
      filters: [{ column: 'id', value: photo.id }],
    })

    return NextResponse.json({ error: `Falha na restauracao: ${error.message}` }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const photoId = searchParams.get('photoId')

  if (!photoId) {
    return NextResponse.json({ error: 'photoId ausente' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('photos')
    .select('status, restored_url, diagnosis, model_used, colorization_suggested, colorization_url')
    .eq('id', photoId)
    .single()

  if (error || !data) {
    return NextResponse.json({ status: 'processing' })
  }

  return NextResponse.json({
    status: data.status,
    restored_url: data.restored_url,
    diagnosis: data.diagnosis,
    model_used: data.model_used,
    colorization_suggested: data.colorization_suggested ?? false,
    colorization_url: data.colorization_url ?? null,
  })
}
