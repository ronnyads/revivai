export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/studio/voice-clone
   Body: FormData { audio: File, name: string }
   Clona a voz do usuário via ElevenLabs e salva voice_id no perfil
───────────────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ELEVENLABS_API_KEY não configurada' }, { status: 500 })

  const form = await req.formData()
  const audio = form.get('audio') as File | null
  const name = form.get('name') as string || `Voz de ${user.email?.split('@')[0]}`

  if (!audio) return NextResponse.json({ error: 'Arquivo de áudio obrigatório' }, { status: 400 })

  const payload = new FormData()
  payload.append('name', name)
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

  const { voice_id } = await res.json()

  // Salva voice_id no perfil do usuário
  const admin = createAdminClient()
  await admin.from('users').update({ elevenlabs_voice_id: voice_id }).eq('id', user.id)

  return NextResponse.json({ voice_id, name })
}
