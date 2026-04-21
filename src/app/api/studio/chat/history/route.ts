import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const agentType = searchParams.get('agentType') ?? 'ugc'

  let query = supabase
    .from('studio_chat_messages')
    .select('role, content, created_at')
    .eq('user_id', user.id)
    .eq('agent_type', agentType)
    .order('created_at', { ascending: true })
    .limit(100)

  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
