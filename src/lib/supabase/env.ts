function normalizeEnvValue(value: string | undefined) {
  if (!value) return ''

  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }

  return trimmed
}

function ensureEnv(name: string) {
  const value = normalizeEnvValue(process.env[name])
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function ensureUrl(name: string) {
  const rawValue = ensureEnv(name)
  const normalizedValue = /^https?:\/\//i.test(rawValue)
    ? rawValue
    : `https://${rawValue.replace(/^\/+/, '')}`

  try {
    const parsed = new URL(normalizedValue)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid protocol')
    }
  } catch {
    throw new Error(`Invalid URL in environment variable: ${name}`)
  }

  return normalizedValue
}

export function getSupabasePublicEnv() {
  return {
    url: ensureUrl('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: ensureEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  }
}

export function getSupabaseAdminEnv() {
  return {
    ...getSupabasePublicEnv(),
    serviceRoleKey: ensureEnv('SUPABASE_SERVICE_ROLE_KEY'),
  }
}
