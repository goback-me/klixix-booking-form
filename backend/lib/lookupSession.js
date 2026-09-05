/**
 * Short-lived, signed tokens that tie vehicle lookups to one booking session.
 *
 * The lookup endpoint is public and its URL ships in the frontend bundle, so
 * anything callable without a token can be scripted against. A token does not
 * make that impossible — a determined script can request one too — but it caps
 * how many billable lookups any single visitor can trigger and makes casual
 * scraping much harder. Pair with a bot challenge for real protection.
 */
import crypto from 'node:crypto'

const TOKEN_TTL_SECONDS = 30 * 60 // one booking sitting

let cachedSecret = null

function getSecret() {
  const configured = process.env.LOOKUP_SESSION_SECRET?.trim()
  if (configured) return configured

  if (!cachedSecret) {
    cachedSecret = crypto.randomBytes(32).toString('hex')
    console.warn(
      '⚠️  LOOKUP_SESSION_SECRET is not set — generated a temporary one. ' +
      'Tokens will be rejected across restarts and between serverless instances. ' +
      'Set this environment variable in production.'
    )
  }
  return cachedSecret
}

function sign(payload) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export function issueLookupToken() {
  const body = {
    sid: crypto.randomBytes(12).toString('base64url'),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  }
  const payload = Buffer.from(JSON.stringify(body)).toString('base64url')
  return { token: `${payload}.${sign(payload)}`, expiresIn: TOKEN_TTL_SECONDS }
}

/** @returns {{ valid: true, sid: string } | { valid: false, reason: string }} */
export function verifyLookupToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) {
    return { valid: false, reason: 'missing' }
  }

  const [payload, signature] = token.split('.')
  if (!payload || !signature) return { valid: false, reason: 'malformed' }

  const expected = sign(payload)
  const given = Buffer.from(signature)
  const want = Buffer.from(expected)
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) {
    return { valid: false, reason: 'bad signature' }
  }

  let body
  try {
    body = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return { valid: false, reason: 'unreadable' }
  }

  if (!body?.sid || typeof body.exp !== 'number') return { valid: false, reason: 'incomplete' }
  if (Math.floor(Date.now() / 1000) >= body.exp) return { valid: false, reason: 'expired' }

  return { valid: true, sid: body.sid }
}

export const LOOKUP_SESSION_TTL_SECONDS = TOKEN_TTL_SECONDS
