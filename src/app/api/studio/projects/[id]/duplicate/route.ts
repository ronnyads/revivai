import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // 1. Pega projeto original
  const { data: project } = await supabase
    .from('studio_projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  const admin = createAdminClient()

  // 2. Cria novo projeto
  const newProjectId = crypto.randomUUID()
  const { error: pErr } = await admin.from('studio_projects').insert({
    id: newProjectId,
    user_id: user.id,
    template: project.template,
    title: `${project.title} (Cópia)`,
  })
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  // 3. Pega assets
  const { data: assets } = await admin.from('studio_assets').select('*').eq('project_id', id)
  
  const idMap = new Map<string, string>() // old -> new

  if (assets && assets.length > 0) {
    const newAssets = assets.map(a => {
      const newAssetId = crypto.randomUUID()
      idMap.set(a.id, newAssetId)
      return {
        id: newAssetId,
        project_id: newProjectId,
        user_id: user.id,
        type: a.type,
        status: a.status,
        input_params: a.input_params,
        result_url: a.result_url,
        last_frame_url: a.last_frame_url,
        x: a.x,
        y: a.y,
        width: a.width,
        height: a.height,
        color: a.color,
      }
    })
    await admin.from('studio_assets').insert(newAssets)
  }

  // 4. Pega conexões
  const { data: connections } = await admin.from('studio_connections').select('*').eq('project_id', id)
  if (connections && connections.length > 0) {
    const newConns = connections.map(c => ({
      id: crypto.randomUUID(),
      project_id: newProjectId,
      source_id: idMap.get(c.source_id) ?? c.source_id,
      target_id: idMap.get(c.target_id) ?? c.target_id,
      source_handle: c.source_handle,
      target_handle: c.target_handle,
    }))
    
    await admin.from('studio_connections').insert(newConns)
  }

  return NextResponse.json({ ok: true, newProjectId })
}
