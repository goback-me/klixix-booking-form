/**
 * MechanicDesk mode selector + environment guard.
 *
 * A deterministic FAKE adapter exists for staging QA (see fakeMechanicDesk.js).
 * It must be IMPOSSIBLE to enable in production:
 *   - If MECHANICDESK_FAKE is set while running in a production environment, the
 *     process FAILS CLOSED — assertFakeModeSafe() throws, so the server refuses to
 *     start and request handling refuses to proceed. It never silently falls back
 *     to the real path, and it never serves the fake in production.
 *   - When no fake flag is set, resolvePostMechanicDesk() returns the real impl
 *     unchanged — the production code path is not weakened in any way.
 */

/** Truthy env flag parse: '1' | 'true' | 'yes' | 'on' (case-insensitive). */
function flagOn(v) {
  return ['1', 'true', 'yes', 'on'].includes(String(v || '').trim().toLowerCase())
}

/**
 * Is this an isolated STAGING environment (where the fake adapter may run)?
 *  - STAGING_MODE=1 is an explicit opt-in so a dedicated staging PROJECT can run its
 *    own "production" deployment (stable *.vercel.app URL) and still use fake mode.
 *    Real production never sets STAGING_MODE, so it is never treated as staging.
 *  - Otherwise: Vercel preview/development are staging; VERCEL_ENV is authoritative.
 *  - Off Vercel (Render/local), anything but NODE_ENV==='production' is staging.
 */
export function isStagingEnv() {
  if (flagOn(process.env.STAGING_MODE)) return true
  const vercelEnv = String(process.env.VERCEL_ENV || '').trim().toLowerCase()
  if (vercelEnv) return vercelEnv !== 'production'
  return String(process.env.NODE_ENV || '').trim().toLowerCase() !== 'production'
}

/** Is this REAL production? (The negation of staging — fake mode is forbidden here.) */
export function isProductionEnv() {
  return !isStagingEnv()
}

/** Was fake MechanicDesk mode requested via env? */
export function isFakeModeRequested() {
  return flagOn(process.env.MECHANICDESK_FAKE)
}

/**
 * Fail closed if the fake flag appears in production. Call at startup AND on every
 * selection, so the fake can never be served in production even if startup is skipped.
 * @throws {Error} when MECHANICDESK_FAKE is set in a production environment
 */
export function assertFakeModeSafe() {
  if (isFakeModeRequested() && isProductionEnv()) {
    throw new Error(
      'FATAL: MECHANICDESK_FAKE is set in a PRODUCTION environment. Refusing to run ' +
      '(fail closed). Remove MECHANICDESK_FAKE from production configuration.'
    )
  }
}

/** True only when the fake adapter should be used (requested AND non-production). */
export function isFakeModeEnabled() {
  assertFakeModeSafe()
  return isFakeModeRequested() && !isProductionEnv()
}

/**
 * Return the MechanicDesk POST function to use. Real impl unless fake mode is
 * safely enabled (non-production + flag). Resolved per call so env changes and the
 * fail-closed assert take effect on every request.
 * @param {(token:string, fields:object)=>Promise<any>} realImpl
 */
export function resolvePostMechanicDesk(realImpl) {
  if (isFakeModeEnabled()) {
    // Lazy import so the fake module is never loaded on the production path.
    // eslint-disable-next-line
    return async (token, fields) => {
      const { makeFakeMechanicDesk } = await import('./fakeMechanicDesk.js')
      const fake = makeFakeMechanicDesk({
        scenario: process.env.MECHANICDESK_FAKE_SCENARIO,
        delayMs: process.env.MECHANICDESK_FAKE_DELAY_MS,
      })
      return fake(token, fields)
    }
  }
  return realImpl
}
