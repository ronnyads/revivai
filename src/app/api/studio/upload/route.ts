export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/studio/upload
   Body: FormData { file: File }
   Faz upload de imagem ou áudio para o bucket studio e retorna a URL pública
───────────────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Arquivo obrigatório' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const path = `${user.id}/uploads/${id}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const admin = createAdminClient()

  const { error } = await admin.storage
    .from('studio')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
