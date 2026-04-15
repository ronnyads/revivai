export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/studio/webhook?assetId=&userId=
   Replicate callback para vídeo Kling AI
───────────────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const assetId = searchParams.get('assetId')
  const userId  = searchParams.get('userId')

  if (!assetId || !userId) {
    return NextResponse.json({ error: 'assetId e userId obrigatórios' }, { status: 400 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { status, output, error: replicateError } = body

  if (status === 'succeeded' && output) {
    const videoUrl = Array.isArray(output) ? output[0] : output

    await admin.from('studio_assets').update({
      status: 'done',
      result_url: videoUrl,
    }).eq('id', assetId)

    // Debita créditos do vídeo (3)
    for (let i = 0; i < 3; i++) {
      await admin.rpc('debit_credit', { user_id_param: userId })
    }

    console.log(`[studio/webhook] Vídeo ${assetId} concluído: ${videoUrl}`)
  } else if (status === 'failed' || status === 'canceled') {
    await admin.from('studio_assets').update({
      status: 'error',
      error_msg: replicateError ? String(replicateError) : 'Geração de vídeo falhou',
    }).eq('id', assetId)
  }

  return NextResponse.json({ ok: true })
}
