export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getModelVersion } from '@/lib/replicate'

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/upscale
   Body: JSON { photoId: string }
   Upscales a restored photo 4x using Real-ESRGAN. Costs 1 credit.
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

  // ── Validate request ──
  const { photoId } = await req.json()
  if (!photoId) return NextResponse.json({ error: 'photoId ausente' }, { status: 400 })

  // ── Fetch photo ──
  const { data: photo } = await supabase
    .from('photos')
    .select('id, user_id, restored_url, colorization_url, status')
    .eq('id', photoId)
    .eq('user_id', user.id)
    .single()

  if (!photo) return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 })
  if (photo.status !== 'done') return NextResponse.json({ error: 'Foto ainda não restaurada' }, { status: 400 })
  if (!photo.restored_url) return NextResponse.json({ error: 'URL da foto restaurada ausente' }, { status: 400 })

  // Use colorized version if available, otherwise use restored
  const sourceUrl = photo.colorization_url || photo.restored_url

  try {
    if (!process.env.REPLICATE_API_TOKEN) throw new Error('REPLICATE_API_TOKEN não configurada')
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

    // ── Run Real-ESRGAN 4x upscale ──
    const version = await getModelVersion(replicate, 'nightmareai/real-esrgan')
    const prediction = await replicate.predictions.create({
      version,
      input: {
        image: sourceUrl,
        scale: 4,
        face_enhance: false,
      },
    })

    // Poll until done (max 120s — upscaling takes longer than colorization)
    let result = prediction
    const startTime = Date.now()
    while (result.status !== 'succeeded' && result.status !== 'failed' && result.status !== 'canceled') {
      if (Date.now() - startTime > 120000) throw new Error('Timeout no upscale')
      await new Promise(r => setTimeout(r, 2000))
      result = await replicate.predictions.get(result.id)
    }

    if (result.status !== 'succeeded' || !result.output) {
      throw new Error(result.error ? String(result.error) : 'Real-ESRGAN falhou')
    }

    const output = result.output
    const upscaledUrl =
      typeof output === 'string' ? output :
      Array.isArray(output) ? output[0] :
      null

    if (!upscaledUrl) throw new Error('Real-ESRGAN retornou saída inválida')

    // ── Save result and debit credit ──
    const admin = createAdminClient()
    await admin.from('photos').update({ upscale_url: upscaledUrl }).eq('id', photoId)
    await admin.rpc('debit_credit', { user_id_param: user.id })

    console.log(`[upscale] Photo ${photoId} upscaled 4x: ${upscaledUrl}`)
    return NextResponse.json({ upscale_url: upscaledUrl })

  } catch (err: any) {
    console.error('[upscale] Error:', err.message)
    return NextResponse.json({ error: `Erro no upscale: ${err.message}` }, { status: 500 })
  }
}
