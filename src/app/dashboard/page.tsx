
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardContent from '@/components/dashboard/DashboardContent'
import type { Photo, StudioProject } from '@/types'

type RecentProjectRow = Pick<StudioProject, 'id' | 'title' | 'updated_at' | 'status'> & {
  studio_assets?: Array<{ count?: number | null }>
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [
    { data: profile },
    totalPhotosResult,
    completedPhotosResult,
    processingPhotosResult,
    { data: recentPhotosRaw },
    totalProjectsResult,
    { data: recentProjectsRaw },
    { data: latestPaidOrder },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('credits, plan')
      .eq('id', user.id)
      .single(),
    supabase.from('photos').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('photos').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'done'),
    supabase.from('photos').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'processing'),
    supabase
      .from('photos')
      .select('id, status, created_at, original_url, restored_url, colorization_url, upscale_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(4),
    supabase.from('studio_projects').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase
      .from('studio_projects')
      .select('id, title, updated_at, status, studio_assets(count)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(3),
    supabase
      .from('orders')
      .select('amount')
      .eq('user_id', user.id)
      .eq('status', 'paid')
      .in('type', ['package', 'subscription'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const recentPhotos = (recentPhotosRaw ?? []) as Pick<
    Photo,
    'id' | 'status' | 'created_at' | 'original_url' | 'restored_url' | 'colorization_url' | 'upscale_url'
  >[]
  const recentProjects = ((recentProjectsRaw ?? []) as RecentProjectRow[]).map(
    (project): Pick<StudioProject, 'id' | 'title' | 'updated_at' | 'status'> & { asset_count: number } => ({
      id: project.id,
      title: project.title,
      updated_at: project.updated_at,
      status: project.status,
      asset_count: project.studio_assets?.[0]?.count ?? 0,
    }),
  )

  return (
    <DashboardContent
      credits={profile?.credits ?? 0}
      plan={profile?.plan ?? 'free'}
      totalPhotos={totalPhotosResult.count ?? 0}
      completedPhotos={completedPhotosResult.count ?? 0}
      processingPhotos={processingPhotosResult.count ?? 0}
      totalProjects={totalProjectsResult.count ?? 0}
      recentPhotos={recentPhotos}
      recentProjects={recentProjects}
      latestPaidOrderAmount={latestPaidOrder?.amount ?? null}
    />
  )
}
