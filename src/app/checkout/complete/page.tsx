import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function CheckoutCompletePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const userId = params.external_reference
  const status = params.status || params.collection_status
  const planId = params.plan || 'perPhoto'

  if (status !== 'approved' || !userId) {
    redirect('/#pricing')
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const admin = createAdminClient()

  try {
    const { data: userData } = await admin.auth.admin.getUserById(userId)
    if (!userData.user?.email) redirect('/auth/login')

    const { data: linkData } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent('/dashboard?success=1&plan=' + planId)}`,
      },
    })

    if (linkData?.properties?.action_link) {
      redirect(linkData.properties.action_link)
    }
  } catch {
    // fallback
  }

  redirect('/auth/login')
}
