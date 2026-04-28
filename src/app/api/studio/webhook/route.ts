export const dynamic = 'force-dynamic'
export const maxDuration = 120 // 2 minutes to allow downloading/uploading videos without Vercel killing the webhook

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { markStudioAssetFailed } from '@/lib/studioAssetFailure'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/studio/webhook?assetId=&userId=
   Callback do Replicate (vídeo Kling) e Fal AI (lipsync) — idempotente
───────────────────────────────────────────────────────────────────────────── */

/**
 * Baixa um arquivo de URL temporária (Replicate/Fal AI) e re-faz upload no
 * Supabase Storage para garantir que a URL seja permanente.
 * Se o download ou upload falhar, retorna a URL original como fallback.
 */
async function persistToStorage(
  admin: ReturnType<typeof createAdminClient>,
  url: string,
  userId: string,
  assetId: string,
): Promise<string> {
  try {
    const res = await fetch(url)
    if (!res.ok) return url
    const buffer = Buffer.from(await res.arrayBuffer())
    const path = `${userId}/${assetId}-result.mp4`
    const { error } = await admin.storage
      .from('studio')
      .upload(path, buffer, { contentType: 'video/mp4', upsert: true })
    if (error) {
      console.warn(`[studio/webhook] Upload Supabase falhou para ${assetId}: ${error.message}`)
      return url
    }
    const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
    return publicUrl
  } catch (e) {
    console.warn(`[studio/webhook] persistToStorage falhou para ${assetId}:`, e)
    return url // fallback — melhor ter URL temporária do que nada
  }
}

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
    .select('status')
    .eq('id', assetId)
    .single()

  if (current?.status === 'done') {
    console.log(`[studio/webhook] Asset ${assetId} já concluído — ignorando retry`)
    return NextResponse.json({ ok: true })
  }

  const { status, output, payload, error: reqError } = body

  // Replicate: status === 'succeeded', output contém a URL
  // Fal AI:    status === 'COMPLETED' (fila) ou 'OK' (legado), payload contém o resultado
  const isSuccess =
    (status === 'succeeded' && output) ||
    ((status === 'OK' || status === 'COMPLETED') && payload)

  if (isSuccess) {
    let rawUrl = ''
    if (output) { // Replicate
      rawUrl = Array.isArray(output) ? (output as string[])[0] : output as string
    } else if (payload) { // Fal AI
      const falPayload = asRecord(payload)
      const videoValue = falPayload.video as { url?: string } | Array<{ url?: string }> | undefined
      const resultValue = asRecord(falPayload.result)
      const nestedResultVideo = asRecord(resultValue.video)
      const outputValue = Array.isArray(falPayload.output) ? falPayload.output : []
      const firstVidUrl = Array.isArray(videoValue) ? videoValue[0]?.url : videoValue?.url
      rawUrl = firstVidUrl ?? String(falPayload.video_url ?? falPayload.url ?? nestedResultVideo.url ?? outputValue[0] ?? '')
    }

    if (!rawUrl) {
      console.warn(`[studio/webhook] Nenhuma URL extraída do payload para ${assetId}`)
      await markStudioAssetFailed({
        admin,
        assetId,
        errorMsg: `Succeeded but no URL found. Body: ${JSON.stringify(body).slice(0, 500)}`,
        refundReason: 'async-webhook:missing-output-url',
      })
      return NextResponse.json({ ok: true })
    }

    // Salva URL temporária imediatamente — garante que o vídeo fica visível
    // mesmo se o upload pro Supabase Storage falhar ou timeout
    await admin.from('studio_assets').update({
      status: 'done',
      result_url: rawUrl,
      last_frame_url: rawUrl,
    }).eq('id', assetId)

    console.log(`[studio/webhook] ✅ Asset ${assetId} concluído (URL temporária): ${rawUrl}`)

    // Re-upload para Supabase em segundo plano para URL permanente
    persistToStorage(admin, rawUrl, userId, assetId).then(permanentUrl => {
      if (permanentUrl !== rawUrl) {
        admin.from('studio_assets').update({
          result_url: permanentUrl,
          last_frame_url: permanentUrl,
        }).eq('id', assetId)
        console.log(`[studio/webhook] ✅ Asset ${assetId} persistido permanentemente: ${permanentUrl}`)
      }
    }).catch(e => console.warn(`[studio/webhook] persistToStorage falhou (não crítico):`, e))
  } else if (
    status === 'failed' || status === 'canceled' ||
    status === 'ERROR'  || status === 'FAILED'
  ) {
    await markStudioAssetFailed({
      admin,
      assetId,
      errorMsg: reqError ? String(reqError) : 'Geração falhou no provedor',
      refundReason: `async-webhook:${String(status ?? 'unknown').toLowerCase()}`,
    })

    console.log(`[studio/webhook] ❌ Asset ${assetId} falhou: ${reqError}`)
  }

  return NextResponse.json({ ok: true })
}
