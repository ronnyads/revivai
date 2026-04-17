export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/studio/upload/sign
   Body: { filename: string, contentType: string }
   Retorna uma URL assinada para upload direto ao Supabase Storage.
   O cliente faz PUT direto no Supabase — nunca passa pelo Vercel.
───────────────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { filename, contentType } = await req.json()
  if (!filename) return NextResponse.json({ error: 'filename obrigatório' }, { status: 400 })

  const ext = filename.split('.').pop()?.toLowerCase() ?? 'mp4'
  const id  = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const path = `${user.id}/uploads/${id}.${ext}`

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from('studio')
    .createSignedUploadUrl(path)

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao criar URL assinada' }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path,
    publicUrl,
  })
}
