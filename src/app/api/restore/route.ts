export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { diagnosePhoto, MODEL_VERSIONS } from '@/lib/diagnose'
import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })

/* POST /api/restore — upload + start restoration */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check credits
  const { data: profile } = await supabase
    .from('users').select('credits, plan').eq('id', user.id).single()

  if (!profile || profile.credits < 1) {
    return NextResponse.json({ error: 'Sem créditos suficientes' }, { status: 402 })
  }

  const formData   = await req.formData()
  const file       = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

  const bytes    = await file.arrayBuffer()
  const buffer   = Buffer.from(bytes)
  const fileName = `${user.id}/${Date.now()}-${file.name}`

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('photos').upload(fileName, buffer, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl: originalUrl } } = supabase.storage
    .from('photos').getPublicUrl(fileName)

  // Diagnose
  const diagnosis = diagnosePhoto({
    isGrayscale:      file.name.toLowerCase().includes('bw') || file.name.toLowerCase().includes('pb'),
    hasLowResolution: true, // default
  })

  // Save photo record
  const { data: photo } = await supabase.from('photos').insert({
    user_id:    user.id,
    original_url: originalUrl,
    status:     'processing',
    model_used: diagnosis.model,
    diagnosis:  diagnosis.label,
  }).select().single()

  if (!photo) return NextResponse.json({ error: 'DB error' }, { status: 500 })

  // Start Replicate prediction (async)
  startRestoration(photo.id, originalUrl, diagnosis.model, user.id, supabase)

  return NextResponse.json({
    photoId:    photo.id,
    originalUrl,
    diagnosis: { label: diagnosis.label, description: diagnosis.description, icon: diagnosis.icon },
  })
}

/* GET /api/restore?photoId=xxx — poll status */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const photoId = searchParams.get('photoId')
  if (!photoId) return NextResponse.json({ error: 'Missing photoId' }, { status: 400 })

  const { data } = await supabase
    .from('photos').select('status, restored_url').eq('id', photoId).single()

  return NextResponse.json(data ?? { status: 'processing' })
}

/* ── Async restoration runner ── */
async function startRestoration(
  photoId: string,
  originalUrl: string,
  model: string,
  userId: string,
  supabase: any
) {
  try {
    const version = MODEL_VERSIONS[model as keyof typeof MODEL_VERSIONS]
    const input: any = { image: originalUrl }

    // Model-specific params
    if (model === 'nightmareai/real-esrgan')  input.scale = 4
    if (model === 'sczhou/codeformer')        input.codeformer_fidelity = 0.7
    if (model === 'arielreplicate/deoldify')  input.model_name = 'ColorizeStable'

    const output = await replicate.run(version as `${string}/${string}:${string}`, { input }) as string | string[]
    const restored_url = Array.isArray(output) ? output[0] : output

    await supabase.from('photos').update({
      restored_url,
      status: 'done',
    }).eq('id', photoId)

    // Debit credit
    await supabase.rpc('debit_credit', { user_id_param: userId })
  } catch {
    await supabase.from('photos').update({ status: 'error' }).eq('id', photoId)
  }
}
