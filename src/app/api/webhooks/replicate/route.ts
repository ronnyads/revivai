import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MODEL_CONFIGS } from '@/lib/diagnose'
import Replicate from 'replicate'

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────────────────────
// Helper: get latest version hash from Replicate API
// ─────────────────────────────────────────────────────────────────────────────
async function getModelVersion(replicate: Replicate, owner: string, name: string): Promise<string> {
  const modelInfo = await replicate.models.get(owner, name)
  const version = modelInfo.latest_version?.id
  if (!version) throw new Error(`No latest_version for ${owner}/${name}`)
  return version
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: extract URL from various Replicate output shapes
// ─────────────────────────────────────────────────────────────────────────────
function extractOutputUrl(output: unknown): string | null {
  if (typeof output === 'string' && output.startsWith('http')) return output
  if (Array.isArray(output) && typeof output[0] === 'string') return output[0]
  if (output && typeof output === 'object' && 'url' in output) return (output as any).url
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build Webhook URL for a given stage
// ─────────────────────────────────────────────────────────────────────────────
function buildWebhookUrl(baseUrl: string, photoId: string, userId: string, stage: string): string {
  return `${baseUrl}/api/webhooks/replicate?photoId=${photoId}&userId=${userId}&stage=${stage}`
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/webhooks/replicate
// Replicate calls this when a prediction finishes
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body     = await req.json()
    const status   = body.status as string
    const output   = body.output

    const { searchParams } = new URL(req.url)
    const photoId  = searchParams.get('photoId')
    const userId   = searchParams.get('userId')
    const stage    = searchParams.get('stage') ?? 'stage1_colorize'

    if (!photoId || !userId) {
      console.error('[webhook] Missing photoId or userId')
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    // Ignore intermediate statuses (starting, processing)
    if (status !== 'succeeded' && status !== 'failed' && status !== 'canceled') {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const supabase = createAdminClient()

    // ── FAILED ────────────────────────────────────────────────────────────────
    if (status === 'failed' || status === 'canceled') {
      const errMsg = body.error ? String(body.error) : 'Replicate rejected the request'
      console.error(`[webhook] ${stage} FAILED for photo ${photoId}:`, errMsg)
      await supabase.from('photos').update({
        status:       'error',
        restored_url: `❌ Erro em ${stage}: ${errMsg}`,
      }).eq('id', photoId)
      return NextResponse.json({ ok: true })
    }

    // ── SUCCEEDED ─────────────────────────────────────────────────────────────
    const resultUrl = extractOutputUrl(output)
    if (!resultUrl) {
      console.error(`[webhook] ${stage} succeeded but output is unreadable:`, output)
      await supabase.from('photos').update({
        status:       'error',
        restored_url: `❌ Saída inválida em ${stage}: ${JSON.stringify(output)}`,
      }).eq('id', photoId)
      return NextResponse.json({ ok: true })
    }

    console.log(`[webhook] ${stage} completed for photo ${photoId}: ${resultUrl}`)

    // ── STAGE 1 DONE — launch Stage 2 ────────────────────────────────────────
    if (stage === 'stage1_colorize') {
      console.log(`[webhook] Launching Stage 2 (CodeFormer) for photo ${photoId}`)

      try {
        const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
        const config    = MODEL_CONFIGS['sczhou/codeformer']
        const [owner, name] = config.name.split('/')
        const version   = await getModelVersion(replicate, owner, name)
        const input     = config.buildInput(resultUrl)

        const reqUrl    = new URL(req.url)
        const baseUrl   = `${reqUrl.protocol}//${reqUrl.host}`
        const webhookUrl = buildWebhookUrl(baseUrl, photoId, userId, 'stage2_restore')

        const prediction = await replicate.predictions.create({
          version,
          input,
          webhook: webhookUrl,
          webhook_events_filter: ['completed'],
        } as any)

        // Store colorized intermediate + stage marker
        await supabase.from('photos').update({
          diagnosis:    'Fase 2: Restaurando rostos e detalhes...',
          restored_url: `CHAIN:${prediction.id}:${resultUrl}`,
        }).eq('id', photoId)

        console.log(`[webhook] Stage 2 dispatched: ${prediction.id}`)

      } catch (err: any) {
        // Stage 2 failed to start — still deliver stage 1 result as fallback
        console.error('[webhook] Stage 2 launch failed, delivering stage 1 result:', err.message)
        await supabase.from('photos').update({
          status:       'done',
          restored_url: resultUrl,
        }).eq('id', photoId)
        await supabase.rpc('debit_credit', { user_id_param: userId })
      }

      return NextResponse.json({ ok: true })
    }

    // ── STAGE 2 DONE — mark as final ─────────────────────────────────────────
    if (stage === 'stage2_restore') {
      console.log(`[webhook] Final result for photo ${photoId}: ${resultUrl}`)
      await supabase.from('photos').update({
        status:       'done',
        restored_url: resultUrl,
        diagnosis:    'Restauração concluída ✨',
      }).eq('id', photoId)
      await supabase.rpc('debit_credit', { user_id_param: userId })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })

  } catch (err: any) {
    console.error('[webhook] Unhandled error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
