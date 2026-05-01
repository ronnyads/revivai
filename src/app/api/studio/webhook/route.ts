export const dynamic = 'force-dynamic'
export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { markStudioAssetFailed } from '@/lib/studioAssetFailure'
import { getLogicalStudioAssetType } from '@/lib/studioAssetType'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

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
    if (error) return url
    const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
    return publicUrl
  } catch {
    return url
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const assetId = searchParams.get('assetId')
  const userId = searchParams.get('userId')

  if (!assetId || !userId) {
    return NextResponse.json({ error: 'assetId e userId obrigatÃ³rios' }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body invÃ¡lido' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: current } = await admin
    .from('studio_assets')
    .select('status, type, input_params')
    .eq('id', assetId)
    .single()

  if (current?.status === 'done') {
    console.log(`[studio/webhook] Asset ${assetId} jÃ¡ concluÃ­do â€” ignorando retry`)
    return NextResponse.json({ ok: true })
  }

  const { status, output, payload, error: reqError } = body
  const isSuccess =
    (status === 'succeeded' && output) ||
    ((status === 'OK' || status === 'COMPLETED') && payload)

  if (isSuccess) {
    let rawUrl = ''
    if (output) {
      rawUrl = Array.isArray(output) ? (output as string[])[0] : output as string
    } else if (payload) {
      const falPayload = asRecord(payload)
      const videoValue = falPayload.video as { url?: string } | Array<{ url?: string }> | undefined
      const resultValue = asRecord(falPayload.result)
      const nestedResultVideo = asRecord(resultValue.video)
      const outputValue = Array.isArray(falPayload.output) ? falPayload.output : []
      const firstVidUrl = Array.isArray(videoValue) ? videoValue[0]?.url : videoValue?.url
      rawUrl = firstVidUrl ?? String(falPayload.video_url ?? falPayload.url ?? nestedResultVideo.url ?? outputValue[0] ?? '')
    }

    if (!rawUrl) {
      await markStudioAssetFailed({
        admin,
        assetId,
        errorMsg: `Succeeded but no URL found. Body: ${JSON.stringify(body).slice(0, 500)}`,
        refundReason: 'async-webhook:missing-output-url',
      })
      return NextResponse.json({ ok: true })
    }

    const currentInputParams = asRecord(current?.input_params)
    const logicalType = getLogicalStudioAssetType(current?.type, currentInputParams)
    const permanentUrl = await persistToStorage(admin, rawUrl, userId, assetId)
    const nextInputParams = logicalType === 'talking_video'
      ? {
          ...currentInputParams,
          pipeline_stage: 'completed',
        }
      : currentInputParams

    await admin.from('studio_assets').update({
      status: 'done',
      result_url: permanentUrl,
      last_frame_url: permanentUrl,
      input_params: nextInputParams,
    }).eq('id', assetId)

    console.log(`[studio/webhook] âœ… Asset ${assetId} concluÃ­do: ${permanentUrl}`)
  } else if (
    status === 'failed' || status === 'canceled' ||
    status === 'ERROR' || status === 'FAILED'
  ) {
    await markStudioAssetFailed({
      admin,
      assetId,
      errorMsg: reqError ? String(reqError) : 'GeraÃ§Ã£o falhou no provedor',
      refundReason: `async-webhook:${String(status ?? 'unknown').toLowerCase()}`,
    })
    console.log(`[studio/webhook] âŒ Asset ${assetId} falhou: ${reqError}`)
  }

  return NextResponse.json({ ok: true })
}
