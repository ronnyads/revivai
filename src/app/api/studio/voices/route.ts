export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/studio/voices
   Returns: { platform_voices, user_voices }
───────────────────────────────────────────────────────────────────────────── */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const [{ data: platform }, { data: userVoices }] = await Promise.all([
    admin
      .from('studio_platform_voices')
      .select('voice_id, name, gender, language, description')
      .eq('active', true)
      .order('sort_order'),
    admin
      .from('studio_user_voices')
      .select('id, voice_id, name, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    platform_voices: platform ?? [],
    user_voices: userVoices ?? [],
  })
}
