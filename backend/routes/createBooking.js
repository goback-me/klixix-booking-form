import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { body, validationResult } from 'express-validator'
import { claimBooking, getBookingByIdemKey, updateBookingState } from '../lib/bookingsStore.js'
import { sendBookingWebhook } from '../lib/webhook.js'
import { resolvePostMechanicDesk, isFakeModeEnabled } from '../lib/mechanicDeskMode.js'

const router = Router()
const AU_TIMEZONE = 'Australia/Brisbane'
const MECHANICDESK_URL = 'https://www.mechanicdesk.com.au/booking_requests/create_booking'

/** Reduce an AU phone to canonical 0-leading digits (handles +61 / 61 forms). */
function toAuPhoneDigits(raw) {
  let s = String(raw || '').replace(/[^\d+]/g, '')
  if (s.startsWith('+61')) s = '0' + s.slice(3)
  else if (s.startsWith('61') && s.length === 11) s = '0' + s.slice(2)
  return s.replace(/\D/g, '')
}

/** A valid AU number: 10 digits, 0 + a mobile (4) or landline (2/3/5/7/8) prefix. */
function isValidAuPhone(raw) {
  return /^0[234578]\d{8}$/.test(toAuPhoneDigits(raw))
}

/** Normalise a valid AU number to compact 0-leading form (e.g. 0412345678) for MechanicDesk SMS. */
function normalizeAuPhone(raw) {
  const digits = toAuPhoneDigits(raw)
  return /^0[234578]\d{8}$/.test(digits) ? digits : String(raw || '').trim()
}

// ──────────────────────────────────────────────────────────────────────────
// Pure helpers (exported for unit tests — no network/DB).
// ──────────────────────────────────────────────────────────────────────────

/** Configurable MechanicDesk request timeout (ms), validated. Default 12000. */
export function getMechanicDeskTimeoutMs() {
  const parsed = Number.parseInt(String(process.env.MECHANICDESK_TIMEOUT_MS || ''), 10)
  if (Number.isFinite(parsed) && parsed >= 1000 && parsed <= 60000) return parsed
  return 12000
}

/**
 * Classify a MechanicDesk attempt into a booking_state.
 *  - 'confirmed'    : HTTP 2xx (MechanicDesk accepted — the only success)
 *  - 'sync_failed'  : explicit rejection (HTTP non-2xx) or a connection that provably never sent
 *  - 'sync_unknown' : aborted/timed-out — MechanicDesk MAY have created the booking; outcome indeterminate
 * @param {{ ok?:boolean, status?:number, aborted?:boolean, networkError?:boolean }} r
 * @returns {{ state:'confirmed'|'sync_failed'|'sync_unknown', errorCategory:string|null }}
 */
export function classifyMechanicDeskOutcome(r) {
  if (r.aborted) return { state: 'sync_unknown', errorCategory: 'timeout' }
  if (r.ok) return { state: 'confirmed', errorCategory: null }
  if (typeof r.status === 'number') {
    return { state: 'sync_failed', errorCategory: r.status >= 500 ? 'md_5xx' : 'md_rejected' }
  }
  // fetch rejected without a response (DNS/refused). Treat as unknown: we cannot
  // prove MechanicDesk did not receive it, so we must not silently auto-retry.
  return { state: 'sync_unknown', errorCategory: 'network' }
}

/**
 * Map a resolved outcome to the HTTP response (the success-state contract).
 * `confirmed` is the ONLY state that yields a conversion-eligible success.
 * @returns {{ status:number, body:object }}
 */
export function httpForOutcome({ state, stored, bookingId, idempotencyKey, duplicate = false }) {
  const booking_reference = bookingId || idempotencyKey || null
  if (state === 'confirmed') {
    return { status: 200, body: { confirmed: true, synced: true, stored: Boolean(bookingId), state, booking_reference, booking_id: bookingId || null, ...(duplicate ? { duplicate: true } : {}) } }
  }
  if (stored || bookingId) {
    // Recovery lead (sync_failed | sync_unknown | still syncing). Received, NOT confirmed.
    return { status: 202, body: { confirmed: false, pending: true, synced: false, stored: true, state, booking_reference, ...(duplicate ? { duplicate: true } : {}) } }
  }
  // Nothing stored and not confirmed.
  return { status: 502, body: { confirmed: false, state: state || 'failed', error: 'We could not submit your booking. Please try again or call us.' } }
}

/** Translate an existing (duplicate/retry) row into the same contract, never re-calling MechanicDesk. */
export function responseForExistingRow(row) {
  const state = row?.booking_state || 'received'
  return httpForOutcome({ state, stored: true, bookingId: row?.id || null, idempotencyKey: row?.idempotency_key || null, duplicate: true })
}

/** POST to MechanicDesk with a controlled AbortController timeout (broad runtime support). */
async function postMechanicDesk(token, bookingFields) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), getMechanicDeskTimeoutMs())
  try {
    const response = await fetch(MECHANICDESK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...bookingFields }),
      signal: controller.signal,
    })
    let responseData = { ok: response.ok }
    try { responseData = await response.json() } catch { /* MechanicDesk may return empty */ }
    return { ok: response.ok, status: response.status, responseData }
  } catch (error) {
    return { aborted: error?.name === 'AbortError', networkError: error?.name !== 'AbortError', error }
  } finally {
    clearTimeout(timer)
  }
}

function toYmdInTimezone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return formatter.format(date)
}

function addDaysToYmd(ymd, amount) {
  const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  date.setUTCDate(date.getUTCDate() + amount)
  return toYmdInTimezone(date, AU_TIMEZONE)
}

function getBrisbaneBookingCutoffYmd() {
  const now = new Date()
  const todayInBrisbane = toYmdInTimezone(now, AU_TIMEZONE)
  const currentHour = Number.parseInt(
    new Intl.DateTimeFormat('en-AU', {
      timeZone: AU_TIMEZONE,
      hour: '2-digit',
      hour12: false,
    }).formatToParts(now).find((part) => part.type === 'hour')?.value || '0',
    10
  )

  return currentHour >= 16 ? addDaysToYmd(todayInBrisbane, 2) : addDaysToYmd(todayInBrisbane, 1)
}

function parseDropOffDate(value) {
  if (typeof value !== 'string') return null

  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+\d{2}:\d{2}$/)
  if (!match) return null

  return `${match[3]}-${match[2]}-${match[1]}`
}

const validate = [
  body('workshop').trim().notEmpty().withMessage('Workshop is required'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required')
    .bail()
    .custom((value) => {
      if (!isValidAuPhone(value)) throw new Error('Please enter a valid Australian phone number')
      return true
    }),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('registration_number').trim().notEmpty().withMessage('Registration is required'),
  body('make').trim().notEmpty().withMessage('Make is required'),
  body('model').trim().notEmpty().withMessage('Model is required'),
  body('year').trim().notEmpty().withMessage('Year is required'),
  body('drop_off_time').trim().notEmpty().withMessage('Drop off time is required'),
  body('drop_off_time').custom((value) => {
    const selectedDate = parseDropOffDate(value)
    if (!selectedDate) {
      throw new Error('Invalid drop off time')
    }

    const earliestAllowedDate = getBrisbaneBookingCutoffYmd()
    if (!earliestAllowedDate) {
      throw new Error('Unable to validate booking date')
    }

    if (selectedDate < earliestAllowedDate) {
      throw new Error('Bookings for tomorrow close after 4:00 PM Brisbane time')
    }

    return true
  }),
]

function unavailableBody() {
  return { confirmed: false, error: 'Booking is temporarily unavailable. Please try again in a moment or call us.' }
}

/** Real dependency wiring for processBooking (overridden by unit tests).
 *  postMechanicDesk is resolved per call: the real impl in production, or (only in a
 *  safely-enabled non-production environment) the deterministic fake adapter. The
 *  selector fails closed if the fake flag ever appears in production. */
const realDeps = {
  claimBooking,
  getBookingByIdemKey,
  postMechanicDesk: (token, fields) => resolvePostMechanicDesk(postMechanicDesk)(token, fields),
  updateBookingState,
  sendBookingWebhook,
}

/**
 * Orchestrate one booking attempt. FAIL-CLOSED: MechanicDesk is called ONLY after
 * an atomic Supabase claim establishes idempotent ownership. If ownership cannot be
 * established (DB error / storage unconfigured) we return 503 and never submit.
 * @returns {Promise<{ status:number, body:object, mechanicDeskCalled:boolean, reason:string }>}
 */
export async function processBooking({ payload, token, idemKey, deps = realDeps }) {
  const d = deps

  // 1) Atomic claim. No ownership → FAIL CLOSED (503), never call MechanicDesk.
  let claim
  try {
    claim = await d.claimBooking(payload, idemKey)
  } catch (dbError) {
    console.error('Booking claim failed (DB error) — refusing to submit without idempotent ownership:', dbError?.message || dbError)
    return { status: 503, body: unavailableBody(), mechanicDeskCalled: false, reason: 'claim_error' }
  }
  if (!claim || claim.configured === false) {
    console.error('Booking storage is not configured — refusing to submit without idempotent ownership.')
    return { status: 503, body: unavailableBody(), mechanicDeskCalled: false, reason: 'storage_unconfigured' }
  }
  if (claim.created === false) {
    // A concurrent/retried request already owns it → return its state, NEVER call MechanicDesk.
    const existing = claim.row || await d.getBookingByIdemKey(idemKey)
    const { status, body } = responseForExistingRow(existing || { idempotency_key: idemKey, booking_state: 'syncing' })
    return { status, body, mechanicDeskCalled: false, reason: 'duplicate' }
  }

  // 2) This request owns MechanicDesk submission; the stored row exists.
  const bookingId = claim.row?.id || null
  const { workshop, ...bookingFields } = payload
  const shortRef = bookingId ? `CARONE-${String(bookingId).replace(/-/g, '').slice(0, 8).toUpperCase()}` : null
  const sourceTag = `[Online booking${shortRef ? ` · ${shortRef}` : ''}]`
  for (const key of ['note', 'booking_note', 'alert']) {
    const existing = typeof bookingFields[key] === 'string' && bookingFields[key].trim()
    bookingFields[key] = existing ? `${sourceTag} ${bookingFields[key]}` : sourceTag
  }

  const attempt = await d.postMechanicDesk(token, bookingFields)
  const { state, errorCategory } = classifyMechanicDeskOutcome(attempt)
  const mechanicdeskRef = attempt.responseData?.booking_id || attempt.responseData?.id || attempt.responseData?.request_id || null

  // Persist the transition. Fire-and-forget: a failed update must NOT change the
  // customer outcome — it leaves a stale row that recovery surfaces (docs/booking-recovery.md).
  if (bookingId) {
    const resp = attempt.responseData || (attempt.error ? { error: String(attempt.error.message || attempt.error).slice(0, 500) } : null)
    Promise.resolve(d.updateBookingState(bookingId, state, { mechanicdeskRef: mechanicdeskRef ? String(mechanicdeskRef) : null, errorCategory, response: resp }))
      .catch((e) => console.error(`Booking state update failed for ${shortRef} (state=${state}) — needs reconciliation:`, e?.message || e))
  }
  if (state !== 'confirmed') {
    console.error(`MechanicDesk ${state}${errorCategory ? ` (${errorCategory})` : ''} for ${shortRef || idemKey}`)
  }

  // 3) Lead webhook (confirmed booking or stored recovery lead). Fire-and-forget.
  if (bookingId || state === 'confirmed') {
    Promise.resolve(d.sendBookingWebhook(payload, { bookingId, mechanicdeskRef }))
      .catch((e) => console.error('Booking webhook error:', e?.message || e))
  }

  const { status, body } = httpForOutcome({ state, stored: Boolean(bookingId), bookingId, idempotencyKey: idemKey })
  return { status, body, mechanicDeskCalled: true, reason: state }
}

router.post('/create-booking', validate, async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg })
  }

  // Normalise the phone once (stored row + MechanicDesk both get a clean AU number).
  if (req.body.phone) req.body.phone = normalizeAuPhone(req.body.phone)

  // Idempotency key: the client sends a crypto-strong UUID; generate one if absent.
  const idemKey = (typeof req.body.idempotency_key === 'string' && req.body.idempotency_key.trim())
    ? req.body.idempotency_key.trim()
    : randomUUID()
  req.body.idempotency_key = idemKey

  const workshopId = String(req.body.workshop).toLowerCase()
  const tokenMap = {
    hendra: process.env.HENDRA_TOKEN?.trim(),
    woolloongabba: process.env.WOOLLOONGABBA_TOKEN?.trim(),
  }
  if (!Object.prototype.hasOwnProperty.call(tokenMap, workshopId)) {
    return res.status(400).json({ error: 'Invalid workshop ID' })
  }
  // In fake mode (non-production staging only) the fake adapter ignores the token,
  // so a real MechanicDesk credential is NOT required — keeps real tokens unset on
  // staging. Production (fake off) still fails safe when a token is missing.
  const token = tokenMap[workshopId] || (isFakeModeEnabled() ? 'staging-fake-no-token' : null)
  if (!token) {
    console.error(`Missing MechanicDesk token for workshop '${workshopId}'`)
    return res.status(500).json({ error: 'Booking is temporarily unavailable. Please call us to book.' })
  }

  const result = await processBooking({ payload: req.body, token, idemKey })
  return res.status(result.status).json(result.body)
})

export default router
