export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/studio/webhook?assetId=&userId=
   Callback do Replicate (vídeo Kling) — idempotente
───────────────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const assetId = searchParams.get('assetId')
  const userId  = searchParams.get('userId')

  if (!assetId || !userId) {
    return NextResponse.json({ error: 'assetId e userId obrigatórios' }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const admin = createAdminClient()

  // ── Idempotência: se já está 'done', ignora retry do provider ──
  const { data: current } = await admin
    .from('studio_assets')
    .select('status, credits_cost')
    .eq('id', assetId)
    .single()

  if (current?.status === 'done') {
    console.log(`[studio/webhook] Asset ${assetId} já concluído — ignorando retry`)
    return NextResponse.json({ ok: true })
  }

  const { status, output, payload, error: reqError } = body

  // Replicate: status === 'succeeded'. Fal AI: status === 'OK'
  if ((status === 'succeeded' && output) || (status === 'OK' && payload)) {
    let videoUrl = ''
    if (output) { // Replicate
      videoUrl = Array.isArray(output) ? (output as string[])[0] : output as string
    } else if (payload) { // Fal AI
      const falPayload = payload as any
      videoUrl = falPayload.video?.url ?? falPayload.output?.[0]
    }

    await admin.from('studio_assets').update({
      status: 'done',
      result_url: videoUrl,
      last_frame_url: videoUrl,
    }).eq('id', assetId)

    // Debita créditos apenas uma vez (idempotência garantida acima)
    const cost = current?.credits_cost ?? 3
    for (let i = 0; i < cost; i++) {
      await admin.rpc('debit_credit', { user_id_param: userId })
    }

    console.log(`[studio/webhook] ✅ Vídeo/LipSync ${assetId} concluído: ${videoUrl}`)
  } else if (status === 'failed' || status === 'canceled' || status === 'ERROR' || status === 'FAILED') {
    await admin.from('studio_assets').update({
      status: 'error',
      error_msg: reqError ? String(reqError) : 'Geração falhou no provedor',
    }).eq('id', assetId)

    console.log(`[studio/webhook] ❌ Asset ${assetId} falhou: ${reqError}`)
  }

  return NextResponse.json({ ok: true })
}
