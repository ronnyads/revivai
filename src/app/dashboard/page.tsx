
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardContent from '@/components/dashboard/DashboardContent'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: photos }] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('photos').select('*').eq('user_id', user.id).neq('status', 'error').order('created_at', { ascending: false })
      .then(r => ({ data: r.data?.filter(p => p.status !== 'done' || p.restored_url) ?? null, error: r.error })),
  ])

  const photoList = photos ?? []

  return (
    <DashboardContent
      userHandle={user.email?.split('@')[0] ?? ''}
      photos={photoList}
      credits={profile?.credits ?? 0}
      totalPhotos={photoList.length}
      donePhotos={photoList.filter(p => p.status === 'done').length}
    />
  )
}
