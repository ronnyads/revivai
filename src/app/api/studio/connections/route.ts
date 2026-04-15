export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/* GET /api/studio/connections?project_id= */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('project_id')
  if (!projectId) return NextResponse.json({ error: 'project_id obrigatório' }, { status: 400 })

  const { data, error } = await supabase
    .from('studio_connections')
    .select('*')
    .eq('project_id', projectId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ connections: data ?? [] })
}

/* POST /api/studio/connections
   Body: { project_id, source_id, target_id, source_handle, target_handle } */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { project_id, source_id, target_id, source_handle, target_handle } = body

  if (!project_id || !source_id || !target_id || !target_handle) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('studio_connections')
    .insert({ project_id, source_id, target_id, source_handle: source_handle ?? 'output', target_handle })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ connection: data }, { status: 201 })
}
