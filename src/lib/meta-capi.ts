import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

type MetaServerEventInput = {
  eventName: 'Purchase' | 'CompleteRegistration' | 'Lead'
  eventId?: string
  eventSourceUrl?: string
  email?: string
  name?: string
  externalId?: string
  value?: number
  currency?: string
  contentIds?: string[]
  contentName?: string
}

let cachedPixelId: string | null | undefined

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function hashIfPresent(value?: string) {
  const normalized = value ? normalize(value) : ''
  return normalized ? sha256(normalized) : undefined
}

function splitName(name?: string) {
  if (!name) return { firstName: '', lastName: '' }
  const parts = name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)

  return {
    firstName: parts[0] ?? '',
    lastName: parts.length > 1 ? parts[parts.length - 1] : '',
  }
}

async function getMetaPixelId() {
  if (process.env.META_PIXEL_ID) return process.env.META_PIXEL_ID
  if (cachedPixelId !== undefined) return cachedPixelId

  try {
    const admin = createAdminClient()
    const { data } = await admin.from('settings').select('value').eq('key', 'meta_pixel_id').single()
    cachedPixelId = typeof data?.value === 'string' ? data.value : null
  } catch {
    cachedPixelId = null
  }

  return cachedPixelId
}

export async function sendMetaServerEvent(input: MetaServerEventInput) {
  const accessToken =
    process.env.META_CONVERSIONS_API_ACCESS_TOKEN ??
    process.env.META_CAPI_ACCESS_TOKEN ??
    ''

  if (!accessToken) {
    return { ok: false, skipped: 'missing_access_token' as const }
  }

  const pixelId = await getMetaPixelId()
  if (!pixelId) {
    return { ok: false, skipped: 'missing_pixel_id' as const }
  }

  const { firstName, lastName } = splitName(input.name)
  const userData = {
    em: hashIfPresent(input.email),
    fn: hashIfPresent(firstName),
    ln: hashIfPresent(lastName),
    external_id: hashIfPresent(input.externalId),
  }

  const data = {
    event_name: input.eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: 'website',
    event_source_url: input.eventSourceUrl ?? process.env.NEXT_PUBLIC_APP_URL,
    user_data: Object.fromEntries(Object.entries(userData).filter(([, value]) => Boolean(value))),
    custom_data: Object.fromEntries(
      Object.entries({
        value: input.value,
        currency: input.currency ?? (input.value != null ? 'BRL' : undefined),
        content_ids: input.contentIds?.length ? input.contentIds : undefined,
        content_name: input.contentName,
      }).filter(([, value]) => value !== undefined)
    ),
  }

  const version = process.env.META_GRAPH_API_VERSION ?? 'v22.0'
  const response = await fetch(`https://graph.facebook.com/${version}/${pixelId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [data],
      access_token: accessToken,
      ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    console.warn(`[meta-capi] ${input.eventName} falhou: ${response.status} ${errorText}`)
    return { ok: false, skipped: 'request_failed' as const }
  }

  return { ok: true as const }
}
