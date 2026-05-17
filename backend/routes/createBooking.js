import { Router } from 'express'
import { body, validationResult } from 'express-validator'

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
    return res.status(500).json({
      error: `Missing API token for workshop '${workshopId}'. Check backend .env variables.`,
    })
  }

  try {
    const payload = {
      token,
      ...bookingFields,
    }

    const response = await fetch(
      'https://www.mechanicdesk.com.au/booking_requests/create_booking',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || 'Booking creation failed')
    }

    const data = await response.json().catch(() => ({ ok: true }))
    return res.status(200).json(data)
  } catch (error) {
    console.error('Create booking API error:', error)
    return res.status(500).json({ error: error.message || 'Failed to create booking' })
  }
})

export default router
