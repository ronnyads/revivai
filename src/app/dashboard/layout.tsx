import DashboardShell from '@/components/dashboard/DashboardShell'
import { createClient } from '@/lib/supabase/server'
import { getCommercialPlanLabel } from '@/lib/plan-labels'
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

  const [{ data: profile }, { data: latestPaidOrder }] = await Promise.all([
    supabase
      .from('users')
      .select('credits, plan')
      .eq('id', user.id)
      .single(),
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

  const plan = profile?.plan ?? 'free'
  const credits = profile?.credits ?? 0
  const planLabel = getCommercialPlanLabel(plan, {
    latestPaidAmount: latestPaidOrder?.amount ?? null,
    credits,
  })

  return (
    <DashboardShell userCredits={credits} userPlan={plan} userPlanLabel={planLabel}>
      {children}
    </DashboardShell>
  )
}
