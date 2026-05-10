export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/studio/voice-clone
   Body: FormData { audio: File, name: string }
   Clona a voz via ElevenLabs e salva em studio_user_voices
───────────────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ELEVENLABS_API_KEY não configurada' }, { status: 500 })

  const form = await req.formData()
  const audio = form.get('audio') as File | null
  const cloneName = (form.get('name') as string | null)?.trim() || `Minha Voz`

  if (!audio) return NextResponse.json({ error: 'Arquivo de áudio obrigatório' }, { status: 400 })

  const payload = new FormData()
  payload.append('name', cloneName)
  payload.append('files', audio)
  payload.append('description', `Clone de voz criado pelo RevivAI Ad Studio`)

  const res = await fetch('https://api.elevenlabs.io/v1/voices/add', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: payload,
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `ElevenLabs erro: ${err}` }, { status: res.status })
  }

  const { voice_id } = await res.json() as { voice_id: string }

  const admin = createAdminClient()

  // Salva na biblioteca de vozes do usuário
  await admin.from('studio_user_voices').upsert({
    user_id: user.id,
    voice_id,
    name: cloneName,
  }, { onConflict: 'user_id,voice_id' })

  // Mantém retrocompatibilidade no perfil (campo legado)
  await admin.from('users').update({ elevenlabs_voice_id: voice_id }).eq('id', user.id)

  return NextResponse.json({ voice_id, name: cloneName })
}

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE /api/studio/voice-clone
   Body: JSON { voice_id: string }
   Remove clone da biblioteca do usuário (e da ElevenLabs se possível)
───────────────────────────────────────────────────────────────────────────── */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { voice_id } = await req.json() as { voice_id: string }
  if (!voice_id) return NextResponse.json({ error: 'voice_id obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  await admin.from('studio_user_voices').delete().eq('user_id', user.id).eq('voice_id', voice_id)

  // Tenta remover da ElevenLabs (não crítico — pode falhar)
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (apiKey) {
    await fetch(`https://api.elevenlabs.io/v1/voices/${voice_id}`, {
      method: 'DELETE',
      headers: { 'xi-api-key': apiKey },
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
