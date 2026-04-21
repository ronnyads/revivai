export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StudioProject } from '@/types'
import StudioPageContent from '@/components/studio/StudioPageContent'

export default async function StudioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: rows } = await supabase
    .from('studio_projects')
    .select('*, studio_assets(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const projects: StudioProject[] = (rows ?? []).map((p: any) => ({
    ...p,
    asset_count: p.studio_assets?.[0]?.count ?? 0,
  }))

  return <StudioPageContent projects={projects} />
}
