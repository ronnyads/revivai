export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import StudioCanvas from '@/components/studio/StudioCanvas'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { mapStudioAssetType } from '@/lib/studioAssetType'
import { markStudioAssetFailed } from '@/lib/studioAssetFailure'
import { StudioAsset, StudioConnection, StudioProject } from '@/types'

interface Props {
  params: Promise<{ projectId: string }>
}

const STALE_ASSET_TIMEOUT_MS = 10 * 60 * 1000
const STALE_ASSET_ERROR = 'Tempo limite excedido - tente novamente'

export default async function BoardPage({ params }: Props) {
  const { projectId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: project } = await supabase
    .from('studio_projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) notFound()

  const { data: assets } = await supabase
    .from('studio_assets')
    .select('*')
    .eq('project_id', projectId)
    .order('board_order', { ascending: true })

  // eslint-disable-next-line react-hooks/purity
  const staleThreshold = new Date(Date.now() - STALE_ASSET_TIMEOUT_MS).toISOString()
  const staleAssets = (assets ?? []).filter((asset) => asset.status === 'processing' && asset.created_at < staleThreshold)

  if (staleAssets.length > 0) {
    const admin = createAdminClient()
    await Promise.all(
      staleAssets.map((asset) =>
        markStudioAssetFailed({
          admin,
          assetId: asset.id,
          errorMsg: STALE_ASSET_ERROR,
          refundReason: 'board-timeout:zombie-processing',
        }),
      ),
    )

    ;(assets ?? []).forEach((asset) => {
      if (staleAssets.some((staleAsset) => staleAsset.id === asset.id)) {
        asset.status = 'error'
        asset.error_msg = STALE_ASSET_ERROR
      }
    })
  }

  const { data: connections } = await supabase
    .from('studio_connections')
    .select('*')
    .eq('project_id', projectId)

  const { data: profile } = await supabase
    .from('users')
    .select('credits, plan')
    .eq('id', user.id)
    .single()

  return (
    <StudioCanvas
      project={project as StudioProject}
      initialAssets={(assets ?? []).map((asset) => mapStudioAssetType(asset)) as StudioAsset[]}
      initialConnections={(connections ?? []) as StudioConnection[]}
      userCredits={profile?.credits ?? 0}
      userPlan={profile?.plan ?? 'free'}
      userId={user.id}
    />
  )
}
