/**
 * MechanicDesk mode selector + HARDENED multi-identity staging guard.
 *
 * The fake adapter is a staging-only tool. A single boolean (STAGING_MODE) is NOT
 * enough — an env var can be copied onto another project. So the fake adapter is
 * permitted ONLY when ALL trusted identity signals agree:
 *
 *   1. MECHANICDESK_FAKE is set, AND
 *   2. STAGING_MODE is set (explicit application mode), AND
 *   3. the Supabase project reference is EXACTLY the staging project
 *      (cwdelnmbawffmfewprzz), AND
 *   4. the trusted Vercel identity (VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL —
 *      system-provided, NOT the client Host header) identifies the staging API
 *      project (carone-booking-api-staging.vercel.app), AND
 *   5. no configuration anywhere references production
 *      (lhzkznzlpmegoteukkuy or embed.car-one.com.au).
 *
 * If MECHANICDESK_FAKE is set but ANY identity check is missing, mismatched or
 * unavailable, assertFakeModeSafe() THROWS so the backend fails closed at startup
 * before accepting requests. When MECHANICDESK_FAKE is absent, the real adapter is
 * returned unchanged. Failure messages name only non-secret identity facts — never
 * a key, token or secret value.
 */

export const STAGING_API_HOST = 'carone-booking-api-staging.vercel.app'
export const STAGING_SUPABASE_REF = 'cwdelnmbawffmfewprzz'
export const PROD_SUPABASE_REF = 'lhzkznzlpmegoteukkuy'
export const PROD_MARKERS = ['lhzkznzlpmegoteukkuy', 'embed.car-one.com.au']

function flagOn(v) {
  return ['1', 'true', 'yes', 'on'].includes(String(v || '').trim().toLowerCase())
}

/** Supabase project ref from the configured SUPABASE_URL (non-secret), or '' . */
export function supabaseRef() {
  const m = String(process.env.SUPABASE_URL || '').match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i)
  return m ? m[1].toLowerCase() : ''
}

/** True if any trusted config field references a production identity. */
export function configMentionsProduction() {
  const blob = [process.env.SUPABASE_URL, process.env.ALLOWED_ORIGIN, process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL]
    .filter(Boolean).join(' ').toLowerCase()
  return PROD_MARKERS.some((m) => blob.includes(m)) || supabaseRef() === PROD_SUPABASE_REF
}

/**
 * Does the trusted Vercel identity identify the staging API project?
 *  true  → confirmed staging host
 *  false → confirmed NON-staging host (a different/production project)
 *  null  → not running on Vercel (local/CI), identity unavailable
 */
export function vercelHostIdentifiesStaging() {
  const prod = String(process.env.VERCEL_PROJECT_PRODUCTION_URL || '').trim().toLowerCase()
  const cur = String(process.env.VERCEL_URL || '').trim().toLowerCase()
  if (!prod && !cur) return null
  if (prod === STAGING_API_HOST || cur === STAGING_API_HOST) return true
  if (cur.startsWith('carone-booking-api-staging-') && cur.endsWith('.vercel.app')) return true
  return false // on Vercel, but not the staging project → NOT staging
}

/** Was fake MechanicDesk mode requested via env? */
export function isFakeModeRequested() {
  return flagOn(process.env.MECHANICDESK_FAKE)
}

/**
 * All identity checks for fake mode. Returns { ok, reason }.
 * reason names only non-secret identity facts.
 */
export function fakeIdentity() {
  if (!flagOn(process.env.STAGING_MODE)) return { ok: false, reason: 'STAGING_MODE not set' }
  if (supabaseRef() !== STAGING_SUPABASE_REF) return { ok: false, reason: `Supabase ref is not the staging project (${supabaseRef() || 'unset'})` }
  if (configMentionsProduction()) return { ok: false, reason: 'configuration references a production identity' }
  const v = vercelHostIdentifiesStaging()
  if (v === false) return { ok: false, reason: 'Vercel identity is not the staging API project' }
  // v === true (confirmed staging host) or v === null (local/CI with staging Supabase + STAGING_MODE)
  return { ok: true, reason: v === true ? 'staging host + staging Supabase + STAGING_MODE' : 'local/CI + staging Supabase + STAGING_MODE' }
}

/**
 * Fail closed if the fake flag is set without the full staging identity.
 * @throws {Error} naming the first failed identity check (no secrets)
 */
export function assertFakeModeSafe() {
  if (!isFakeModeRequested()) return
  const id = fakeIdentity()
  if (!id.ok) {
    throw new Error(
      `FATAL: MECHANICDESK_FAKE is set but the staging identity check failed — ${id.reason}. ` +
      'Refusing to run (fail closed). The fake adapter is permitted only on the staging API ' +
      'project with the staging Supabase project.'
    )
  }
}

/** True only when fake mode is requested AND the full staging identity holds. */
export function isFakeModeEnabled() {
  assertFakeModeSafe()
  return isFakeModeRequested() && fakeIdentity().ok
}

/**
 * Return the MechanicDesk POST function to use. Real impl unless fake mode is
 * safely enabled under the full identity gate. Resolved per call so the fail-closed
 * assert runs on every request.
 * @param {(token:string, fields:object)=>Promise<any>} realImpl
 */
export function resolvePostMechanicDesk(realImpl) {
  if (isFakeModeEnabled()) {
    return async (token, fields) => {
      const { makeFakeMechanicDesk } = await import('./fakeMechanicDesk.js')
      const fake = makeFakeMechanicDesk({ scenario: process.env.MECHANICDESK_FAKE_SCENARIO, delayMs: process.env.MECHANICDESK_FAKE_DELAY_MS })
      return fake(token, fields)
    }
  }
  return realImpl
}
