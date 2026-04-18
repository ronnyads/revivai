import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const admin = createAdminClient()
  
  const { data: prompts } = await admin
    .from('studio_prompts')
    .select('key, value')
    .in('key', [
      'model_engine_google_active', 'model_engine_flux_active',
      'angles_engine_google_active', 'angles_engine_flux_active',
      'angles_fallback_active'
    ])

  const config = {
    google: prompts?.find(p => p.key === 'model_engine_google_active')?.value === 'true',
    flux:   prompts?.find(p => p.key === 'model_engine_flux_active')?.value === 'true',
    anglesGoogle: prompts?.find(p => p.key === 'angles_engine_google_active')?.value === 'true',
    anglesFlux:   prompts?.find(p => p.key === 'angles_engine_flux_active')?.value === 'true',
    anglesFallback: prompts?.find(p => p.key === 'angles_fallback_active')?.value === 'true',
  }

  // Fallback: se nada estiver configurado no model, assume Google como padrão
  if (!config.google && !config.flux) {
    config.google = true
  }

  // Fallback: se nada estiver configurado no angles, assume Flux como padrão
  if (!config.anglesGoogle && !config.anglesFlux) {
    config.anglesFlux = true
  }

  return NextResponse.json(config)
}
