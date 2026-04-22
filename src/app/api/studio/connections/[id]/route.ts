export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/* DELETE /api/studio/connections/[id] */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: existingConnection } = await supabase
    .from('studio_connections')
    .select('project_id')
    .eq('id', id)
    .single()

  const admin = createAdminClient()
  const { error } = await admin.from('studio_connections').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (existingConnection?.project_id) {
    await admin
      .from('studio_projects')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', existingConnection.project_id)
      .eq('user_id', user.id)
  }

  return NextResponse.json({ ok: true })
}
