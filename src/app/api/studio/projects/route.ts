export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StudioTemplate } from '@/types'

// Template presets — cria assets idle ao criar projeto
const TEMPLATE_ASSETS: Record<StudioTemplate, Array<{ type: string; board_order: number; input_params: object }>> = {
  blank: [],
  before_after: [
    { type: 'upscale', board_order: 0, input_params: { source_url: '', scale: 4 } },
    { type: 'image',   board_order: 1, input_params: { prompt: 'produto depois da transformação, resultado incrível', style: 'product', aspect_ratio: '1:1' } },
  ],
  testimonial: [
    { type: 'script', board_order: 0, input_params: { product: '', audience: '', format: 'reels', hook_style: 'problema' } },
    { type: 'image',  board_order: 1, input_params: { prompt: 'pessoa feliz usando o produto, estilo UGC autêntico', style: 'ugc', aspect_ratio: '9:16' } },
    { type: 'voice',  board_order: 2, input_params: { script: '', voice_id: 'EXAVITQu4vr4xnSDxMaL', speed: 1.0 } },
  ],
  product_showcase: [
    { type: 'image',   board_order: 0, input_params: { prompt: 'foto profissional do produto', style: 'product', aspect_ratio: '1:1' } },
    { type: 'image',   board_order: 1, input_params: { prompt: 'pessoa usando o produto no dia a dia', style: 'lifestyle', aspect_ratio: '9:16' } },
    { type: 'video',   board_order: 2, input_params: { source_image_url: '', motion_prompt: 'smooth product showcase', duration: 5 } },
    { type: 'caption', board_order: 3, input_params: { audio_url: '' } },
  ],
}

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/studio/projects — lista projetos do usuário
───────────────────────────────────────────────────────────────────────────── */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: projects, error } = await supabase
    .from('studio_projects')
    .select('*, studio_assets(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ projects })
}

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/studio/projects — cria projeto
   Body: { title?: string, template?: StudioTemplate }
───────────────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const title: string = body.title || 'Novo Projeto'
  const template: StudioTemplate = body.template || 'blank'

  const admin = createAdminClient()

  // Cria projeto
  const { data: project, error } = await admin
    .from('studio_projects')
    .insert({ user_id: user.id, title, template })
    .select()
    .single()

  if (error || !project) return NextResponse.json({ error: error?.message ?? 'Erro ao criar projeto' }, { status: 500 })

  // Pré-popula assets do template
  const presets = TEMPLATE_ASSETS[template] ?? []
  if (presets.length > 0) {
    await admin.from('studio_assets').insert(
      presets.map(p => ({
        project_id: project.id,
        user_id: user.id,
        type: p.type,
        status: 'idle',
        input_params: p.input_params,
        credits_cost: p.type === 'video' ? 3 : 1,
        board_order: p.board_order,
      }))
    )
  }

  return NextResponse.json({ project }, { status: 201 })
}
