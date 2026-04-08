import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MODEL_CONFIGS, PipelineModel } from '@/lib/diagnose'
import {
  buildWebhookUrl,
  parseWebhookParams,
  getPhaseLabel,
  encodePipeState,
} from '@/lib/pipeline'
import {
  checkColorization,
  checkUpscale,
  checkFaceRestoration,
} from '@/lib/quality'
import Replicate from 'replicate'
import { getModelVersion, createPredictionWithRetry } from '@/lib/replicate'

export const dynamic = 'force-dynamic'

const MAX_RETRIES = 1

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractUrl(output: unknown): string | null {
  if (typeof output === 'string' && output.startsWith('http')) return output
  if (Array.isArray(output) && typeof output[0] === 'string')  return output[0]
  if (output && typeof output === 'object' && 'url' in output) return (output as any).url
  return null
}

async function launchPrediction(
  replicate: Replicate,
  modelKey: PipelineModel,
  inputUrl: string,
  webhookUrl: string,
  retry = false,
): Promise<string> {
  const config  = MODEL_CONFIGS[modelKey]
  const input   = config.buildInput(inputUrl, retry)
  const version = await getModelVersion(replicate, config.name)

  const pred = await createPredictionWithRetry(replicate, {
    version,
    input,
    webhook: webhookUrl,
    webhook_events_filter: ['completed'],
  })

  return pred.id
}

function getBaseUrl(req: NextRequest): string {
  const url = new URL(req.url)
  return `${url.protocol}//${url.host}`
}

// ─── Deliver final result ─────────────────────────────────────────────────────

async function deliverResult(
  supabase: ReturnType<typeof createAdminClient>,
  photoId: string,
  userId: string,
  url: string,
  label: string,
) {
  await supabase.from('photos').update({
    status:       'done',
    restored_url: url,
    diagnosis:    label,
  }).eq('id', photoId)
  await supabase.rpc('debit_credit', { user_id_param: userId })
}

async function failResult(
  supabase: ReturnType<typeof createAdminClient>,
  photoId: string,
  errMsg: string,
) {
  await supabase.from('photos').update({
    status:       'error',
    restored_url: `❌ ${errMsg}`,
    diagnosis:    'Erro durante o processamento',
  }).eq('id', photoId)
}

// ─── Main Webhook Handler ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json()
    const status = body.status as string
    const output = body.output

    const p = parseWebhookParams(new URL(req.url).searchParams)

    if (!p.photoId || !p.userId || !p.pipeline.length) {
      console.error('[webhook] Missing required params')
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    // Ignore non-terminal statuses (starting, processing)
    if (status !== 'succeeded' && status !== 'failed' && status !== 'canceled') {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const supabase     = createAdminClient()
    const currentModel = p.pipeline[p.step]
    const isLastStep   = p.step === p.pipeline.length - 1

    console.log(`[pipeline] Webhook | step=${p.step}/${p.pipeline.length - 1} model=${currentModel} status=${status} retry=${p.retry}`)

    // ── FAILED or CANCELED ────────────────────────────────────────────────────
    if (status === 'failed' || status === 'canceled') {
      const errMsg = body.error ? String(body.error) : 'Replicate rejeitou a predição'
      console.error(`[pipeline] Step ${p.step} (${currentModel}) FAILED:`, errMsg)

      if (p.bestUrl) {
        // We have a partial result from a previous step — deliver it
        await deliverResult(supabase, p.photoId, p.userId, p.bestUrl, 'Restauração parcial entregue ⚠️')
      } else {
        await failResult(supabase, p.photoId, errMsg)
      }
      return NextResponse.json({ ok: true })
    }

    // ── SUCCEEDED — Extract output URL ────────────────────────────────────────
    const resultUrl = extractUrl(output)
    if (!resultUrl) {
      console.error(`[pipeline] Step ${p.step} output shape unreadable:`, JSON.stringify(output).slice(0, 200))
      if (p.bestUrl) {
        await deliverResult(supabase, p.photoId, p.userId, p.bestUrl, 'Restauração parcial entregue ⚠️')
      } else {
        await failResult(supabase, p.photoId, '❌ Saída inválida da IA')
      }
      return NextResponse.json({ ok: true })
    }

    console.log(`[pipeline] Step ${p.step} (${currentModel}) succeeded: ${resultUrl}`)

    // ── QUALITY CHECK ─────────────────────────────────────────────────────────
    let qcPassed = true
    let qcScore  = 80 // default optimistic

    try {
      let qcResult

      if (currentModel === 'piddnad/ddcolor') {
        qcResult = await checkColorization(resultUrl, p.isGray)
      } else if (currentModel === 'nightmareai/real-esrgan') {
        qcResult = await checkUpscale(resultUrl, p.inputW, p.inputH)
      } else if (currentModel === 'microsoft/bringing-old-photos-back-to-life') {
        qcResult = { passed: true, score: 90, issues: [] } // Skip deep QC for scratch removal
      } else {
        qcResult = await checkFaceRestoration(resultUrl)
      }

      qcPassed = qcResult.passed
      qcScore  = qcResult.score

      if (qcPassed) {
        console.log(`[pipeline] QC ✅ step=${p.step} score=${qcScore}`)
      } else {
        console.warn(`[pipeline] QC ❌ step=${p.step} score=${qcScore} issues:`, qcResult.issues)
      }
    } catch (qcErr: any) {
      // Quality check is non-blocking: if it crashes, we assume pass and continue
      console.warn('[pipeline] QC threw error (non-blocking):', qcErr.message)
    }

    // ── RETRY SAME STEP if QC failed and we have retries left ────────────────
    if (!qcPassed && p.retry < MAX_RETRIES) {
      console.log(`[pipeline] Retrying step ${p.step} (${currentModel}) — attempt ${p.retry + 1}`)

      try {
        const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
        const baseUrl   = getBaseUrl(req)

        // For retry: use original photo URL (stored in DB)
        const { data: photoRow } = await supabase
          .from('photos').select('original_url').eq('id', p.photoId).single()
        const retryInputUrl = p.step === 0
          ? (photoRow?.original_url ?? resultUrl) // always retry step 0 on original
          : (p.bestUrl || resultUrl)

        const webhookUrl = buildWebhookUrl(baseUrl, { ...p, retry: p.retry + 1 })
        const predId     = await launchPrediction(replicate, currentModel, retryInputUrl, webhookUrl, true)

        await supabase.from('photos').update({
          diagnosis:    `Repetindo Fase ${p.step + 1}/${p.pipeline.length} (qualidade insuficiente)...`,
          restored_url: encodePipeState(p.step, predId),
        }).eq('id', p.photoId)

        return NextResponse.json({ ok: true, retrying: true })
      } catch (retryErr: any) {
        console.error('[pipeline] Retry failed to launch:', retryErr.message)
        // Fall through — will advance to next step or deliver best
      }
    }

    // ── Determine best result URL ─────────────────────────────────────────────
    // Use the new result if QC passed, otherwise keep whatever was best before
    const newBestUrl = qcPassed ? resultUrl : (p.bestUrl || resultUrl)

    // ── FINAL STEP DONE ───────────────────────────────────────────────────────
    if (isLastStep) {
      console.log(`[pipeline] ✅ Pipeline complete! Delivering: ${newBestUrl}`)
      await deliverResult(
        supabase, p.photoId, p.userId, newBestUrl,
        qcPassed ? 'Restauração concluída ✨' : 'Restauração entregue ⚠️'
      )
      return NextResponse.json({ ok: true, done: true })
    }

    // ── LAUNCH NEXT STEP ──────────────────────────────────────────────────────
    const nextStep  = p.step + 1
    const nextModel = p.pipeline[nextStep]

    console.log(`[pipeline] Launching step ${nextStep} (${nextModel})`)

    try {
      const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
      const baseUrl   = getBaseUrl(req)

      // After ESRGAN 4x: next step gets 4x larger image
      const nextInputW = currentModel === 'nightmareai/real-esrgan' ? p.inputW * 4 : p.inputW
      const nextInputH = currentModel === 'nightmareai/real-esrgan' ? p.inputH * 4 : p.inputH

      const webhookUrl = buildWebhookUrl(baseUrl, {
        ...p,
        step:    nextStep,
        bestUrl: newBestUrl,
        inputW:  nextInputW,
        inputH:  nextInputH,
        isGray:  false, // After DDColor step 0, image is always color
        retry:   0,
      })

      const predId = await launchPrediction(replicate, nextModel, newBestUrl, webhookUrl)
      const phase  = getPhaseLabel(nextStep, p.pipeline.length, nextModel)

      await supabase.from('photos').update({
        diagnosis:    phase,
        restored_url: encodePipeState(nextStep, predId),
      }).eq('id', p.photoId)

      console.log(`[pipeline] Step ${nextStep} (${nextModel}) dispatched: ${predId}`)
    } catch (launchErr: any) {
      console.error(`[pipeline] Failed to launch step ${nextStep}:`, launchErr.message)
      // Couldn't launch the next step — deliver best result so far
      await deliverResult(
        supabase, p.photoId, p.userId, newBestUrl,
        `Restauração parcial entregue ⚠️ (${launchErr.message})`
      )
      await supabase.rpc('debit_credit', { user_id_param: p.userId })
    }

    return NextResponse.json({ ok: true })

  } catch (err: any) {
    console.error('[webhook] Unhandled error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
