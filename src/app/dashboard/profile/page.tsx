export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileContent from '@/components/dashboard/ProfileContent'
import { getCommercialPlanLabel } from '@/lib/plan-labels'

function pickString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function getDisplayName(userEmail: string | undefined, metadata: Record<string, unknown>) {
  return (
    pickString(metadata.full_name) ||
    pickString(metadata.name) ||
    pickString(metadata.display_name) ||
    pickString(metadata.username) ||
    userEmail?.split('@')[0] ||
    'Usuário'
  )
}

function getInitials(displayName: string, email?: string) {
  const nameParts = displayName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (nameParts.length > 1) {
    return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
  }

  if (nameParts[0]) return nameParts[0].slice(0, 2).toUpperCase()
  return (email?.slice(0, 2) ?? 'RV').toUpperCase()
}

function getProviderLabel(provider: string | null) {
  if (!provider) return 'Auth email'
  if (provider === 'email') return 'Auth email'
  return provider.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const [profileResult, photosResult, projectsResult, assetsResult, latestPaidOrderResult] = await Promise.all([
    supabase.from('users').select('credits, plan').eq('id', user.id).single(),
    supabase.from('photos').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('studio_projects').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('studio_assets').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
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

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  const appMetadata = (user.app_metadata ?? {}) as Record<string, unknown>
  const displayName = getDisplayName(user.email ?? undefined, metadata)
  const initials = getInitials(displayName, user.email ?? undefined)
  const avatarUrl = pickString(metadata.avatar_url) || pickString(metadata.picture)
  const plan = profileResult.data?.plan ?? 'free'
  const credits = profileResult.data?.credits ?? 0
  const provider = pickString(appMetadata.provider) ?? 'email'

  return (
    <ProfileContent
      displayName={displayName}
      email={user.email ?? 'Sem email'}
      avatarUrl={avatarUrl}
      initials={initials}
      plan={plan}
      planLabel={getCommercialPlanLabel(plan, {
        latestPaidAmount: latestPaidOrderResult.data?.amount ?? null,
        credits,
      })}
      credits={credits}
      photosCount={photosResult.count ?? 0}
      projectsCount={projectsResult.count ?? 0}
      assetsCount={assetsResult.count ?? 0}
      providerLabel={getProviderLabel(provider)}
      emailVerified={Boolean(user.email_confirmed_at)}
      createdAt={user.created_at}
      lastSignInAt={user.last_sign_in_at ?? null}
      userId={user.id}
    />
  )
}
