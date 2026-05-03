import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getRestoreEngineFriendlyName,
  getRestoreEngineSummary,
  inferRestoreEngineProfile,
} from '@/lib/vertex-engines'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('restoration_modes')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[restoration-modes] DB error:', error.message, error.details)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const modes = (data ?? []).map((mode) => {
    const engineProfile = inferRestoreEngineProfile({
      explicitProfile: mode.engine_profile,
      legacyModel: mode.model,
      modeName: mode.name,
    })

    return {
      ...mode,
      model: 'Gerenciado pelo ReviVai',
      engine_profile: engineProfile,
      engine_label: getRestoreEngineFriendlyName(engineProfile),
      engine_summary: getRestoreEngineSummary(engineProfile),
    }
  })

  return NextResponse.json({ modes })
}
