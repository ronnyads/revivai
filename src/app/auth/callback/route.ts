import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Captura IP para detecção de abuso (soft — não bloqueia)
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          ?? request.headers.get('x-real-ip')
          ?? null

        const admin = createAdminClient()

        // Log se outro usuário free já usou esse IP
        if (ip) {
          const { data: sameIp } = await admin
            .from('users')
            .select('id, email')
            .eq('signup_ip', ip)
            .eq('plan', 'free')
            .neq('id', user.id)
            .limit(1)
            .maybeSingle()

          if (sameIp) {
            console.warn(`[auth/callback] IP duplicado free: ${ip} | novo: ${user.email} | existente: ${sameIp.email}`)
          }
        }

        await admin.from('users').upsert({
          id: user.id,
          email: user.email,
          plan: 'free',
          credits: 0,
          ...(ip ? { signup_ip: ip } : {}),
        }, { onConflict: 'id', ignoreDuplicates: true })
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth`)
}
