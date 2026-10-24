import test from 'node:test'
import assert from 'node:assert/strict'
import { decideBookingMessage } from './listener.js'

const IFRAME = { name: 'iframe-window' }      // stand-in for iframe.contentWindow
const OTHER = { name: 'other-window' }
const ORIGIN = 'https://carone-booking-form-staging.vercel.app'
const UUID = 'ee5da886-c945-4cf5-a3cb-0408959265c6'

function ctx(seed = {}) {
  const store = new Map(Object.entries(seed))
  return { embedOrigin: ORIGIN, iframeWindow: IFRAME, session: { get: (k) => store.get(k), set: (k, v) => store.set(k, v) }, _store: store }
}
function msg(over = {}) {
  return { origin: ORIGIN, source: IFRAME, data: { type: 'carone_booking_request_submitted', booking_reference: UUID, workshop: 'hendra', service_type: 'Logbook Service', booking_entry_point: 'main_site', landing_page_type: 'none', ...over } }
}

// ── Phase 6: origin/source/payload security ──────────────────────────────────
test('P6.1 correct message from correct iframe+origin → accept, one push', () => {
  const r = decideBookingMessage(msg(), ctx())
  assert.equal(r.action, 'accept')
  assert.equal(r.push.event, 'booking_request_submitted')
})
test('P6.2 correct-looking message from the PARENT window (source=window) → reject bad_source', () => {
  const e = msg(); e.source = OTHER
  assert.equal(decideBookingMessage(e, ctx()).action, 'reject')
})
test('P6.3 message from ANOTHER iframe → reject bad_source', () => {
  const e = msg(); e.source = { name: 'evil-iframe' }
  assert.equal(decideBookingMessage(e, ctx()).reason, 'bad_source')
})
test('P6.4 wrong origin → reject bad_origin', () => {
  const e = msg(); e.origin = 'https://evil.example.com'
  assert.equal(decideBookingMessage(e, ctx()).reason, 'bad_origin')
})
test('P6.5 missing origin → reject', () => {
  const e = msg(); e.origin = ''
  assert.equal(decideBookingMessage(e, ctx()).action, 'reject')
})
test('P6.6 malformed booking_reference → reject bad_reference', () => {
  assert.equal(decideBookingMessage(msg({ booking_reference: 'not-a-uuid' }), ctx()).reason, 'bad_reference')
})
test('P6.7 missing booking_reference → reject', () => {
  assert.equal(decideBookingMessage(msg({ booking_reference: '' }), ctx()).action, 'reject')
})
test('P6.8 unknown workshop → reject bad_workshop', () => {
  assert.equal(decideBookingMessage(msg({ workshop: 'springfield' }), ctx()).reason, 'bad_workshop')
})
test('P6.9 unknown entry point → coerced to other_embed, still accepts', () => {
  const r = decideBookingMessage(msg({ booking_entry_point: 'hacker' }), ctx())
  assert.equal(r.action, 'accept')
  assert.equal(r.push.booking_entry_point, 'other_embed')
})
test('P6.10 extra fields with fake PII → NOT forwarded (strict whitelist)', () => {
  const r = decideBookingMessage(msg({ name: 'QA Tester', email: 'qa@x.test', phone: '0412345678', registration_number: 'QA123', note: 'secret note', evil: 1 }), ctx())
  assert.deepEqual(Object.keys(r.push).sort(), ['booking_entry_point', 'booking_reference', 'event', 'landing_page_type', 'service_type', 'workshop'])
  for (const k of ['name', 'email', 'phone', 'registration_number', 'note', 'evil']) assert.equal(k in r.push, false)
})
test('P6.11 wrong message type → reject bad_type', () => {
  assert.equal(decideBookingMessage(msg({ type: 'something_else' }), ctx()).reason, 'bad_type')
})
test('P6.12 null / non-object message → reject', () => {
  assert.equal(decideBookingMessage({ origin: ORIGIN, source: IFRAME, data: null }, ctx()).action, 'reject')
  assert.equal(decideBookingMessage({ origin: ORIGIN, source: IFRAME, data: 'string' }, ctx()).action, 'reject')
})
test('P6 chrome signals (resize/close) are ignored, never pushed', () => {
  assert.equal(decideBookingMessage({ origin: ORIGIN, source: IFRAME, data: { type: 'carone-resize', height: 600 } }, ctx()).action, 'ignore')
})

// ── Phase 3: dedupe (sessionStorage key written → no second push) ─────────────
test('P3 duplicate message (session already has key) → acked, NOT pushed again', () => {
  const r = decideBookingMessage(msg(), ctx({ ['carone_booked_' + UUID]: '1' }))
  assert.equal(r.action, 'duplicate')
  assert.equal(r.ack, UUID)
  assert.equal(r.push, undefined)
})
test('P3 first accept writes the dedupe key before returning push', () => {
  const c = ctx()
  decideBookingMessage(msg(), c)
  assert.equal(c._store.get('carone_booked_' + UUID), '1')  // key set → a replay now dedupes
  assert.equal(decideBookingMessage(msg(), c).action, 'duplicate')
})

// ── AC paid journey: stable service_type passes through, 5 fields only, redirect ──
test('AC paid: service_type air_conditioning_service passes through; exactly 5 payload fields; paid redirect', () => {
  const r = decideBookingMessage(msg({ service_type: 'air_conditioning_service', booking_entry_point: 'paid_landing', landing_page_type: '/ac-service-new-brisbane/' }), ctx())
  assert.equal(r.action, 'accept')
  assert.equal(r.push.service_type, 'air_conditioning_service')
  assert.equal(r.push.booking_entry_point, 'paid_landing')
  assert.equal(r.push.landing_page_type, '/ac-service-new-brisbane/')
  assert.equal(r.redirect, true)
  assert.deepEqual(Object.keys(r.push).sort(), ['booking_entry_point', 'booking_reference', 'event', 'landing_page_type', 'service_type', 'workshop'])
})

// ── Phase 7: paid vs non-paid redirect ───────────────────────────────────────
test('P7.A paid_landing → redirect requested (after push)', () => {
  const r = decideBookingMessage(msg({ booking_entry_point: 'paid_landing' }), ctx())
  assert.equal(r.action, 'accept')
  assert.equal(r.redirect, true)
})
test('P7.B main_site (non-paid) → NO redirect', () => {
  assert.equal(decideBookingMessage(msg({ booking_entry_point: 'main_site' }), ctx()).redirect, false)
})
test('P7.B direct (non-paid) → NO redirect', () => {
  assert.equal(decideBookingMessage(msg({ booking_entry_point: 'direct' }), ctx()).redirect, false)
})
