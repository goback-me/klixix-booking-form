/**
 * Cloudflare Turnstile loader.
 *
 * The vehicle lookup behind the form is billed per call, so the backend only
 * issues a lookup session once the browser has passed a Turnstile challenge.
 * This module loads the Turnstile script once and hands back the global API.
 *
 * Leave VITE_TURNSTILE_SITE_KEY blank to skip the challenge entirely (the
 * backend only accepts that while InfoAgent is in test mode).
 */

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__caroneTurnstileReady'

export const TURNSTILE_SITE_KEY = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim()

/** @type {Promise<any> | null} */
let loader = null

/** Resolves with `window.turnstile` once the script has loaded. */
export function loadTurnstile() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  const w = /** @type {any} */ (window)
  if (w.turnstile) return Promise.resolve(w.turnstile)
  if (loader) return loader

  loader = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      loader = null
      reject(new Error('Turnstile script timed out'))
    }, 20_000)

    w.__caroneTurnstileReady = () => {
      clearTimeout(timer)
      resolve(w.turnstile)
    }

    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.defer = true
    script.onerror = () => {
      clearTimeout(timer)
      loader = null
      reject(new Error('Turnstile script failed to load'))
    }
    document.head.appendChild(script)
  })
  return loader
}
