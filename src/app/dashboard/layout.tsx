import DashboardShell from '@/components/dashboard/DashboardShell'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('credits, plan')
    .eq('id', user.id)
    .single()

  return (
    <DashboardShell userCredits={profile?.credits ?? 0} userPlan={profile?.plan ?? 'free'}>
      {children}
    </DashboardShell>
  )
}
