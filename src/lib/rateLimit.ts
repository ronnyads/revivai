/**
 * Lightweight in-memory rate limiter.
 * Uses a sliding-window counter keyed by userId or IP.
 * No external dependency — resets on server restart (acceptable for serverless).
 *
 * Usage:
 *   const ok = checkRateLimit(userId, 'restore', { max: 5, windowMs: 60_000 })
 *   if (!ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 */

interface WindowEntry {
  count: number
  windowStart: number
}

const store = new Map<string, WindowEntry>()

// Cleanup stale entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (now - entry.windowStart > 10 * 60_000) store.delete(key)
    }
  }, 5 * 60_000)
}

export interface RateLimitOptions {
  /** Maximum requests allowed within the window */
  max: number
  /** Window duration in milliseconds */
  windowMs: number
}

/**
 * Returns true if the request is within rate limits, false if it should be blocked.
 */
export function checkRateLimit(
  identifier: string,
  namespace: string,
  options: RateLimitOptions
): boolean {
  const key = `${namespace}:${identifier}`
  const now = Date.now()

  const entry = store.get(key)

  if (!entry || now - entry.windowStart > options.windowMs) {
    // New window
    store.set(key, { count: 1, windowStart: now })
    return true
  }

  if (entry.count >= options.max) {
    return false // Blocked
  }

  entry.count++
  return true
}

/**
 * Returns remaining requests and reset time for a given key.
 * Useful for setting X-RateLimit-* headers.
 */
export function getRateLimitInfo(
  identifier: string,
  namespace: string,
  options: RateLimitOptions
): { remaining: number; resetAt: number } {
  const key = `${namespace}:${identifier}`
  const entry = store.get(key)
  if (!entry) return { remaining: options.max, resetAt: Date.now() + options.windowMs }
  const remaining = Math.max(0, options.max - entry.count)
  const resetAt = entry.windowStart + options.windowMs
  return { remaining, resetAt }
}
