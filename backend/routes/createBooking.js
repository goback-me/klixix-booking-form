import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { insertBooking, updateBookingSync } from '../lib/bookingsStore.js'

const router = Router()
const AU_TIMEZONE = 'Australia/Brisbane'

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
  body('phone').trim().notEmpty().withMessage('Phone is required'),
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

  // 2) Forward to MechanicDesk, then record the outcome against the stored row.
  let mechanicDeskOk = false
  let responseData = { ok: true }
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
    const ref = responseData?.booking_id || responseData?.id || responseData?.request_id || null
    updateBookingSync(bookingId, { status: 'sent', response: responseData, ref: ref ? String(ref) : null })
      .catch((e) => console.error('Booking sync-status update failed:', e.message))
  } catch (error) {
    console.error('MechanicDesk create booking error:', error.message)
    updateBookingSync(bookingId, { status: 'failed', response: { error: String(error.message).slice(0, 500) } })
      .catch((e) => console.error('Booking sync-status update failed:', e.message))
  }

  // The request is "received" if it landed anywhere we can act on: the database
  // (staff will reconcile a failed MechanicDesk sync) or MechanicDesk itself.
  if (bookingId || mechanicDeskOk) {
    return res.status(200).json({ ...responseData, stored: Boolean(bookingId), synced: mechanicDeskOk })
  }
  return res.status(502).json({ error: 'We could not submit your booking. Please try again or call us.' })
})

export default router
