/**
 * CarOne confirmed-booking parent listener — shared, testable logic.
 *
 * The same module is imported by the staging parent page (in the browser) AND by
 * listener.test.js (in Node), so the deployed code is exactly the tested code.
 * It validates a postMessage and decides what (if anything) to do: push ONE
 * booking_confirmed with a strict field whitelist, ack the iframe, and — only for
 * paid landing — request a redirect. No PII ever enters the push.
 */

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const ALLOWED_WORKSHOPS = ['hendra', 'woolloongabba']
export const ALLOWED_ENTRY = ['paid_landing', 'main_site', 'direct', 'gbp', 'other_embed']

export function normaliseService(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 60)
}

/**
 * Decide the outcome of an incoming message. Pure (no DOM/timers).
 * @param {{origin:string, data:any, source:any}} event
 * @param {{embedOrigin:string, iframeWindow:any, session:{get:(k:string)=>any, set:(k:string,v:string)=>void}}} ctx
 * @returns {{action:'ignore'|'reject'|'duplicate'|'accept', reason:string, ack?:string, push?:object, redirect?:boolean}}
 */
export function decideBookingMessage(event, ctx) {
  const { embedOrigin, iframeWindow, session } = ctx
  const d = event && event.data

  // Chrome signals (resize/close) are not conversions — ignored, never pushed.
  if (d && (d.type === 'carone-resize' || d === 'carone-booking-close')) return { action: 'ignore', reason: 'chrome_signal' }

  if (event.origin !== embedOrigin) return { action: 'reject', reason: 'bad_origin' }
  if (!d || typeof d !== 'object') return { action: 'reject', reason: 'non_object' }
  if (d.type !== 'carone_booking_confirmed') return { action: 'reject', reason: 'bad_type' }
  if (event.source !== iframeWindow) return { action: 'reject', reason: 'bad_source' }

  const ref = String(d.booking_reference || '')
  if (!UUID_RE.test(ref)) return { action: 'reject', reason: 'bad_reference' }

  const workshop = String(d.workshop || '')
  if (ALLOWED_WORKSHOPS.indexOf(workshop) === -1) return { action: 'reject', reason: 'bad_workshop' }

  let entry = String(d.booking_entry_point || 'direct')
  if (ALLOWED_ENTRY.indexOf(entry) === -1) entry = 'other_embed'
  const service = normaliseService(d.service_type)

  const KEY = 'carone_booked_' + ref
  try { if (session.get(KEY)) return { action: 'duplicate', reason: 'already_pushed', ack: ref } } catch (e) {}
  try { session.set(KEY, '1') } catch (e) {}

  // STRICT whitelist — exactly these five fields, nothing arbitrary, no PII.
  const push = {
    event: 'booking_confirmed',
    booking_reference: ref,
    workshop: workshop,
    service_type: service,
    booking_entry_point: entry,
    landing_page_type: String(d.landing_page_type || 'none'),
  }
  return { action: 'accept', reason: 'confirmed', ack: ref, push, redirect: entry === 'paid_landing' }
}
