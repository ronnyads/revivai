import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdminEnv } from './env'

export function createAdminClient() {
  const { url, serviceRoleKey } = getSupabaseAdminEnv()

  return createSupabaseClient(
    url,
    serviceRoleKey
  )
}
