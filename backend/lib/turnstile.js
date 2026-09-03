/**
 * Cloudflare Turnstile verification.
 *
 * The vehicle-lookup endpoint costs real money per call and InfoAgent has no
 * server-side spend cap, so the only ceiling is ours. Per-IP rate limits do not
 * stop a distributed script; a bot challenge makes every lookup session cost
 * the attacker a solved challenge. The form obtains a Turnstile token in the
 * browser and hands it to /api/lookup-session, which verifies it here before
 * issuing a lookup session token.
 *
 * Fail closed: if verification cannot be completed, no session is issued and
 * the form falls back to manual entry. Nothing is billed.
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const VERIFY_TIMEOUT_MS = 10_000

export function isTurnstileConfigured() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim())
}

/**
 * @param {string | undefined} token  the `cf-turnstile-response` value from the browser
 * @param {string | undefined} remoteIp
 * @returns {Promise<{ ok: true, hostname?: string } | { ok: false, reason: string }>}
 */
export async function verifyTurnstileToken(token, remoteIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) return { ok: false, reason: 'not configured' }

  if (typeof token !== 'string' || !token.trim() || token.length > 4096) {
    return { ok: false, reason: 'missing token' }
  }

  const body = new URLSearchParams({ secret, response: token.trim() })
  if (remoteIp) body.set('remoteip', remoteIp)

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    })
    if (!response.ok) return { ok: false, reason: `siteverify responded ${response.status}` }

    const data = await response.json()
    if (data.success === true) return { ok: true, hostname: data.hostname }

    const codes = Array.isArray(data['error-codes']) ? data['error-codes'].join(',') : 'unknown'
    return { ok: false, reason: `rejected (${codes})` }
  } catch (error) {
    return { ok: false, reason: `siteverify unreachable (${error.name})` }
  }
}
