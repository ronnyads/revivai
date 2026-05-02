const PUBLIC_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const

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

function getPublicEnvValue(name: keyof typeof PUBLIC_ENV) {
  return normalizeEnvValue(PUBLIC_ENV[name])
}

function ensureEnv(name: string) {
  const value = normalizeEnvValue(process.env[name])
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function getSupabasePublicEnv() {
  const url = getPublicEnvValue('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = getPublicEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  if (!url) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!anonKey) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return {
    url: ensureUrlValue(url, 'NEXT_PUBLIC_SUPABASE_URL'),
    anonKey,
  }
}

export function getSupabaseAdminEnv() {
  return {
    ...getSupabasePublicEnv(),
    serviceRoleKey: ensureEnv('SUPABASE_SERVICE_ROLE_KEY'),
  }
}

function ensureUrlValue(rawValue: string, name: string) {
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
