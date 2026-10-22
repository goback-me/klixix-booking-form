import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { insertBooking, updateBookingSync } from '../lib/bookingsStore.js'
import { sendBookingWebhook } from '../lib/webhook.js'

const router = Router()
const AU_TIMEZONE = 'Australia/Brisbane'

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

// Idempotency: a retry / double-click with the same key returns the first result
// instead of creating a second booking. In-memory is enough on a persistent Node
// process (Render); each submit carries one key for ~15 min.
const IDEM_TTL_MS = 15 * 60 * 1000
const recentBookings = new Map()
function idemGet(key) {
  const entry = recentBookings.get(key)
  if (!entry) return null
  if (Date.now() - entry.at > IDEM_TTL_MS) { recentBookings.delete(key); return null }
  return entry.response
}
function idemSet(key, response) {
  recentBookings.set(key, { at: Date.now(), response })
  if (recentBookings.size > 500) {
    const now = Date.now()
    for (const [k, e] of recentBookings) if (now - e.at > IDEM_TTL_MS) recentBookings.delete(k)
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

router.post('/create-booking', validate, async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg })
  }

  // Normalise the phone once, so both the stored row and MechanicDesk get a clean
  // AU number (consistent format → SMS works).
  if (req.body.phone) req.body.phone = normalizeAuPhone(req.body.phone)

  // Idempotency: a retry/double-click with the same key returns the first result.
  const idemKey = typeof req.body.idempotency_key === 'string' ? req.body.idempotency_key.trim() : ''
  if (idemKey) {
    const prior = idemGet(idemKey)
    if (prior) return res.status(200).json({ ...prior, duplicate: true })
  }

  const { workshop, ...bookingFields } = req.body

  const tokenMap = {
    hendra: process.env.HENDRA_TOKEN?.trim(),
    woolloongabba: process.env.WOOLLOONGABBA_TOKEN?.trim(),
  }

  const workshopId = String(workshop).toLowerCase()

  if (!Object.prototype.hasOwnProperty.call(tokenMap, workshopId)) {
    return res.status(400).json({ error: 'Invalid workshop ID' })
  }

  const token = tokenMap[workshopId]
  if (!token) {
    console.error(`Missing MechanicDesk token for workshop '${workshopId}'`)
    return res.status(500).json({ error: 'Booking is temporarily unavailable. Please call us to book.' })
  }

  // 1) Store the booking first, so it is never lost even if MechanicDesk is down.
  let bookingId = null
  try {
    bookingId = await insertBooking(req.body)
  } catch (dbError) {
    // Storage is best-effort: log loudly but keep going so the customer can still book.
    console.error('Booking DB insert failed (continuing to MechanicDesk):', dbError.message)
  }

  // Tag the MechanicDesk booking so staff can tell it came from the online form
  // and match it back to our records. Short, readable ref derived from the
  // Supabase row id (e.g. CARONE-99ECC7FA); the full id still lives in the DB
  // and the webhook payload for an exact lookup.
  const shortRef = bookingId ? `CARONE-${String(bookingId).replace(/-/g, '').slice(0, 8).toUpperCase()}` : null
  const sourceTag = `[Online booking${shortRef ? ` · ${shortRef}` : ''}]`
  for (const key of ['note', 'booking_note', 'alert']) {
    const existing = typeof bookingFields[key] === 'string' && bookingFields[key].trim()
    bookingFields[key] = existing ? `${sourceTag} ${bookingFields[key]}` : sourceTag
  }

  // 2) Forward to MechanicDesk, then record the outcome against the stored row.
  let mechanicDeskOk = false
  let responseData = { ok: true }
  let mechanicdeskRef = null
  try {
    const response = await fetch(
      'https://www.mechanicdesk.com.au/booking_requests/create_booking',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...bookingFields }),
      }
    )

    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || `MechanicDesk returned ${response.status}`)
    }

    responseData = await response.json().catch(() => ({ ok: true }))
    mechanicDeskOk = true
    mechanicdeskRef = responseData?.booking_id || responseData?.id || responseData?.request_id || null
    updateBookingSync(bookingId, { status: 'sent', response: responseData, ref: mechanicdeskRef ? String(mechanicdeskRef) : null })
      .catch((e) => console.error('Booking sync-status update failed:', e.message))
  } catch (error) {
    console.error('MechanicDesk create booking error:', error.message)
    updateBookingSync(bookingId, { status: 'failed', response: { error: String(error.message).slice(0, 500) } })
      .catch((e) => console.error('Booking sync-status update failed:', e.message))
  }

  // 3) Fire the lead webhook server-side (with the booking id) so it can't be lost
  //    on a quote-page redirect and isn't exposed as a public endpoint. Never throws.
  if (bookingId || mechanicDeskOk) {
    await sendBookingWebhook(req.body, { bookingId, mechanicdeskRef })
      .catch((e) => console.error('Booking webhook error:', e?.message || e))
  }

  // The request is "received" if it landed anywhere we can act on: the database
  // (staff will reconcile a failed MechanicDesk sync) or MechanicDesk itself.
  if (bookingId || mechanicDeskOk) {
    const result = { ...responseData, stored: Boolean(bookingId), synced: mechanicDeskOk, booking_id: bookingId || undefined }
    if (idemKey) idemSet(idemKey, result)
    return res.status(200).json(result)
  }
  return res.status(502).json({ error: 'We could not submit your booking. Please try again or call us.' })
})

export default router
