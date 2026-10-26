/**
 * Deterministic FAKE MechanicDesk adapter — STAGING QA ONLY.
 *
 * Never imported on the production path: mechanicDeskMode.js only loads this when
 * fake mode is safely enabled (non-production + MECHANICDESK_FAKE). It returns the
 * SAME result shape as the real postMechanicDesk() so classifyMechanicDeskOutcome()
 * treats it identically:
 *   confirmed success → { ok:true,  status:200, responseData:{...} }
 *   validation reject → { ok:false, status:422, responseData:{...} }
 *   non-2xx failure   → { ok:false, status:500, responseData:{...} }
 *   timeout           → { aborted:true }
 *   network unknown   → { networkError:true, error }
 *   delayed success   → (await delay) confirmed success
 *
 * It makes NO network calls and creates NO real booking.
 */

export const FAKE_SCENARIOS = Object.freeze([
  'confirmed',   // 1. confirmed success (HTTP 200)
  'rejected',    // 2. validation rejection (HTTP 422)
  'server_error',// 3. non-2xx failure (HTTP 500)
  'timeout',     // 4. aborted/timed-out → sync_unknown
  'network',     // 5. network error without response → sync_unknown
  'delayed',     // 6. delayed success (confirmed after a delay)
])

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)))
}

/**
 * Build a fake MechanicDesk POST fn for a fixed scenario.
 * @param {{ scenario?:string, delayMs?:number|string }} [opts]
 * @returns {(token:string, fields:object)=>Promise<object>}
 */
export function makeFakeMechanicDesk(opts = {}) {
  const scenario = FAKE_SCENARIOS.includes(opts.scenario) ? opts.scenario : 'confirmed'
  const delayMs = Number(opts.delayMs) || (scenario === 'delayed' ? 300 : 0)

  return async function fakePostMechanicDesk(_token, _fields) {
    switch (scenario) {
      case 'rejected':
        return { ok: false, status: 422, responseData: { error: 'FAKE validation rejection' } }
      case 'server_error':
        return { ok: false, status: 500, responseData: { error: 'FAKE server error' } }
      case 'timeout':
        return { aborted: true }
      case 'network':
        return { networkError: true, error: new Error('FAKE ECONNREFUSED') }
      case 'delayed': {
        await delay(delayMs)
        return { ok: true, status: 200, responseData: { request_id: `FAKE-MD-${Date.now()}`, fake: true } }
      }
      case 'confirmed':
      default:
        return { ok: true, status: 200, responseData: { request_id: `FAKE-MD-${Math.random().toString(16).slice(2, 10)}`, fake: true } }
    }
  }
}
