import { Router } from 'express'
import { body, validationResult } from 'express-validator'

const router = Router()

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
