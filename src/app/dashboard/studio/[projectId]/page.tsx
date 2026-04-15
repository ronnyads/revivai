export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import StudioCanvas from '@/components/studio/StudioCanvas'
import { StudioProject, StudioAsset, StudioConnection } from '@/types'

interface Props {
  params: Promise<{ projectId: string }>
}

export default async function BoardPage({ params }: Props) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Carrega projeto
  const { data: project } = await supabase
    .from('studio_projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) notFound()

  // Carrega assets ordenados
  const { data: assets } = await supabase
    .from('studio_assets')
    .select('*')
    .eq('project_id', projectId)
    .order('board_order', { ascending: true })

  // Carrega conexões
  const { data: connections } = await supabase
    .from('studio_connections')
    .select('*')
    .eq('project_id', projectId)

  // Créditos do usuário
  const { data: profile } = await supabase
    .from('users')
    .select('credits')
    .eq('id', user.id)
    .single()

  return (
    <StudioCanvas
      project={project as StudioProject}
      initialAssets={(assets ?? []) as StudioAsset[]}
      initialConnections={(connections ?? []) as StudioConnection[]}
      userCredits={profile?.credits ?? 0}
    />
  )
}
